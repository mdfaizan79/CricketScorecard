const express = require('express');
const Series = require('../models/Series');
const Match = require('../models/Match');
const { auth, adminOnly } = require('../middleware/auth');
const { serializeSeries } = require('../utils/serializers');

const router = express.Router();

// GET /api/series - list all series
router.get('/', async (req, res) => {
  try {
    const series = await Series.find()
      .populate('matches', 'status')
      .sort({ startDate: -1 });

    res.json(series.map((entry) => ({
      _id: entry._id,
      id: entry._id,
      name: entry.name,
      format: entry.format,
      teams: entry.teams,
      status: entry.status,
      startDate: entry.startDate,
      endDate: entry.endDate,
      pointsTable: entry.pointsTable || [],
      totalMatches: (entry.matches || []).length,
      completedMatches: (entry.matches || []).filter((match) => match.status === 'completed').length,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/series/:id - get series with matches populated
router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id).populate({
      path: 'matches',
      populate: [
        { path: 'teams.players.player' },
        { path: 'result.playerOfTheMatch' },
        { path: 'innings.battingScorecard.player' },
        { path: 'innings.battingScorecard.bowler' },
        { path: 'innings.battingScorecard.fielder' },
        { path: 'innings.bowlingScorecard.player' },
        { path: 'innings.currentBatsmen.striker.player' },
        { path: 'innings.currentBatsmen.nonStriker.player' },
        { path: 'innings.currentBowler.player' },
        { path: 'innings.fallOfWickets.player' },
      ]
    });
    if (!series) {
      return res.status(404).json({ error: 'Series not found' });
    }
    res.json(serializeSeries(series));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/series - create series (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, format, teams, status, startDate, endDate } = req.body;

    // Initialize points table for each team
    const pointsTable = (teams || []).map(team => ({
      team,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      nrr: 0
    }));

    const series = new Series({
      name,
      format,
      teams,
      pointsTable,
      status: status || 'upcoming',
      startDate,
      endDate
    });

    await series.save();
    res.status(201).json(serializeSeries(series));
  } catch (err) {
    res.status(400).json({ error: 'Error creating series: ' + err.message });
  }
});

// PUT /api/series/:id - update series (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const series = await Series.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!series) {
      return res.status(404).json({ error: 'Series not found' });
    }
    res.json(serializeSeries(series));
  } catch (err) {
    res.status(400).json({ error: 'Error updating series: ' + err.message });
  }
});

// POST /api/series/:id/recalculate - recalculate points table from match results
router.post('/:id/recalculate', auth, adminOnly, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const matches = await Match.find({
      _id: { $in: series.matches },
      status: 'completed'
    });

    // Build a stats map for each team
    const teamStats = {};
    for (const team of series.teams) {
      teamStats[team] = {
        team,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        runsScored: 0,
        oversPlayed: 0,
        runsConceded: 0,
        oversBowled: 0,
        nrr: 0
      };
    }

    for (const match of matches) {
      if (!match.result || !match.result.winner) continue;

      const team1Name = match.teams[0] ? match.teams[0].name : null;
      const team2Name = match.teams[1] ? match.teams[1].name : null;

      if (!team1Name || !team2Name) continue;

      // Ensure teams exist in stats
      if (!teamStats[team1Name]) continue;
      if (!teamStats[team2Name]) continue;

      teamStats[team1Name].played++;
      teamStats[team2Name].played++;

      const winner = match.result.winner;
      const summary = match.result.summary || '';

      if (summary.toLowerCase().includes('tied') || summary.toLowerCase().includes('tie')) {
        teamStats[team1Name].tied++;
        teamStats[team2Name].tied++;
        teamStats[team1Name].points += 1;
        teamStats[team2Name].points += 1;
      } else if (summary.toLowerCase().includes('no result')) {
        teamStats[team1Name].noResult++;
        teamStats[team2Name].noResult++;
        teamStats[team1Name].points += 1;
        teamStats[team2Name].points += 1;
      } else {
        // Determine winner and loser
        const loser = winner === team1Name ? team2Name : team1Name;
        teamStats[winner].won++;
        teamStats[winner].points += 2;
        teamStats[loser].lost++;
      }

      // Calculate NRR components from innings data
      for (const innings of match.innings) {
        const battingTeam = innings.battingTeam;
        const totalOvers = innings.overs + (innings.balls / 6);

        if (teamStats[battingTeam]) {
          teamStats[battingTeam].runsScored += innings.runs;
          teamStats[battingTeam].oversPlayed += totalOvers;
        }

        const bowlingTeam = innings.bowlingTeam;
        if (teamStats[bowlingTeam]) {
          teamStats[bowlingTeam].runsConceded += innings.runs;
          teamStats[bowlingTeam].oversBowled += totalOvers;
        }
      }
    }

    // Calculate NRR and build points table
    const pointsTable = series.teams.map(team => {
      const stats = teamStats[team];
      let nrr = 0;
      if (stats.oversPlayed > 0 && stats.oversBowled > 0) {
        nrr = (stats.runsScored / stats.oversPlayed) - (stats.runsConceded / stats.oversBowled);
      }
      return {
        team: stats.team,
        played: stats.played,
        won: stats.won,
        lost: stats.lost,
        tied: stats.tied,
        noResult: stats.noResult,
        points: stats.points,
        nrr: parseFloat(nrr.toFixed(3))
      };
    });

    // Sort: by points desc, then nrr desc
    pointsTable.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    series.pointsTable = pointsTable;
    await series.save();

    const refreshedSeries = await Series.findById(series._id).populate({
      path: 'matches',
      populate: [
        { path: 'teams.players.player' },
        { path: 'result.playerOfTheMatch' },
        { path: 'innings.battingScorecard.player' },
        { path: 'innings.battingScorecard.bowler' },
        { path: 'innings.battingScorecard.fielder' },
        { path: 'innings.bowlingScorecard.player' },
        { path: 'innings.currentBatsmen.striker.player' },
        { path: 'innings.currentBatsmen.nonStriker.player' },
        { path: 'innings.currentBowler.player' },
        { path: 'innings.fallOfWickets.player' },
      ]
    });

    res.json(serializeSeries(refreshedSeries));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
