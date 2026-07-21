const express = require('express');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Series = require('../models/Series');
const { auth, adminOnly } = require('../middleware/auth');
const {
  formatOvers,
  getObjectId,
  getPlayerName,
  normalizeBall,
  serializeMatch,
} = require('../utils/serializers');

const router = express.Router();

// Helper: get max overs for format
function getMaxOvers(format) {
  switch (format) {
    case 'T20': return 20;
    case 'ODI': return 50;
    case 'Test': return Infinity;
    default: return 50;
  }
}

function getPopulateMatchQuery(filter) {
  return Match.find(filter)
    .populate('teams.players.player')
    .populate('result.playerOfTheMatch')
    .populate('series')
    .populate('innings.battingScorecard.player')
    .populate('innings.battingScorecard.bowler')
    .populate('innings.battingScorecard.fielder')
    .populate('innings.bowlingScorecard.player')
    .populate('innings.currentBatsmen.striker.player')
    .populate('innings.currentBatsmen.nonStriker.player')
    .populate('innings.currentBowler.player')
    .populate('innings.fallOfWickets.player');
}

async function getPopulatedMatchById(matchId) {
  return Match.findById(matchId)
    .populate('teams.players.player')
    .populate('result.playerOfTheMatch')
    .populate('series')
    .populate('innings.battingScorecard.player')
    .populate('innings.battingScorecard.bowler')
    .populate('innings.battingScorecard.fielder')
    .populate('innings.bowlingScorecard.player')
    .populate('innings.currentBatsmen.striker.player')
    .populate('innings.currentBatsmen.nonStriker.player')
    .populate('innings.currentBowler.player')
    .populate('innings.fallOfWickets.player');
}

function broadcastToMatch(matchId, data) {
  try {
    const wsManager = require('../index').wsManager;
    if (wsManager && wsManager.has(matchId)) {
      const clients = wsManager.get(matchId);
      const message = JSON.stringify(data);
      clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  } catch (err) {
    console.error('WebSocket broadcast error:', err.message);
  }
}

function createScorecardEntry(playerId) {
  return {
    player: playerId,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    isNotOut: false,
  };
}

function createBowlingEntry(playerId) {
  return {
    player: playerId,
    overs: 0,
    balls: 0,
    maidens: 0,
    runs: 0,
    wickets: 0,
    economy: 0,
    dots: 0,
    fours: 0,
    sixes: 0,
  };
}

function findTeam(match, reference, fallbackIndex = null) {
  if (!match?.teams?.length) return null;

  if (reference === 'teamA') return match.teams[0] || null;
  if (reference === 'teamB') return match.teams[1] || null;

  const normalizedReference = String(reference || '').trim().toLowerCase();
  if (normalizedReference) {
    const found = match.teams.find((team) =>
      [team.name, team.shortName]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === normalizedReference)
    );
    if (found) return found;
  }

  if (fallbackIndex !== null) {
    return match.teams[fallbackIndex] || null;
  }

  return null;
}

function chooseOpeningBowler(team) {
  if (!team?.players?.length) return null;

  const preferred = team.players.find((entry) => {
    const role = (entry.role || entry.player?.role || '').toLowerCase();
    return role === 'bowler' || role === 'all-rounder';
  });

  return getObjectId((preferred || team.players[0]).player);
}

function chooseOpeningBatsmen(team) {
  const players = (team?.players || []).map((entry) => getObjectId(entry.player)).filter(Boolean);
  return {
    striker: players[0] || null,
    nonStriker: players[1] || players[0] || null,
  };
}

function chooseNextBatsman(team, innings) {
  const currentIds = new Set([
    getObjectId(innings?.currentBatsmen?.striker?.player),
    getObjectId(innings?.currentBatsmen?.nonStriker?.player),
  ].filter(Boolean));
  const outIds = new Set(
    (innings?.battingScorecard || [])
      .filter((entry) => entry.isOut)
      .map((entry) => getObjectId(entry.player))
  );

  return (team?.players || [])
    .map((entry) => getObjectId(entry.player))
    .find((playerId) => playerId && !currentIds.has(playerId) && !outIds.has(playerId)) || null;
}

function buildInningsState({ battingTeam, bowlingTeam, striker, nonStriker, openingBowler, target }) {
  return {
    battingTeam,
    bowlingTeam,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    target,
    currentBatsmen: {
      striker: { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0 },
      nonStriker: { player: nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0 },
    },
    currentBowler: {
      player: openingBowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    },
    battingScorecard: [createScorecardEntry(striker), createScorecardEntry(nonStriker)],
    bowlingScorecard: [createBowlingEntry(openingBowler)],
    fallOfWickets: [],
    overHistory: [[]],
    isCompleted: false,
  };
}

function resolveAutoStartConfig(match) {
  const tossWinner = findTeam(match, match.toss?.winner, 0);
  const otherTeam = match.teams.find((team) => team.name !== tossWinner?.name) || match.teams[1] || match.teams[0];
  const battingTeam = match.toss?.decision === 'bowl' ? otherTeam : tossWinner;
  const bowlingTeam = battingTeam?.name === match.teams?.[0]?.name ? match.teams?.[1] : match.teams?.[0];

  if (!battingTeam || !bowlingTeam) {
    return null;
  }

  const { striker, nonStriker } = chooseOpeningBatsmen(battingTeam);
  const openingBowler = chooseOpeningBowler(bowlingTeam);

  if (!striker || !nonStriker || !openingBowler) {
    return null;
  }

  return {
    battingTeam: battingTeam.name,
    bowlingTeam: bowlingTeam.name,
    striker,
    nonStriker,
    openingBowler,
  };
}

async function ensurePlayers(teamName, players = []) {
  const createdPlayers = [];

  for (const entry of players) {
    const name = entry?.name?.trim();
    if (!name) continue;

    let player = await Player.findOne({ name, team: teamName });
    if (!player) {
      player = await Player.create({
        name,
        team: teamName,
        role: entry.role || 'Batsman',
        jerseyNumber: entry.jerseyNumber === '' || entry.jerseyNumber === undefined ? null : Number(entry.jerseyNumber),
      });
    } else if (entry.jerseyNumber !== '' && entry.jerseyNumber !== undefined && Number(entry.jerseyNumber) !== player.jerseyNumber) {
      player.jerseyNumber = Number(entry.jerseyNumber);
      await player.save();
    }

    createdPlayers.push({
      player: player._id,
      role: entry.role || player.role || 'Batsman',
    });
  }

  return createdPlayers;
}

function normalizeCreatePayload(body) {
  if (Array.isArray(body?.teams)) {
    return body;
  }

  return {
    format: body.format,
    venue: body.venue,
    date: body.date,
    toss: body.toss,
    teamA: body.teamA,
    teamB: body.teamB,
    series: body.series || null,
  };
}

function buildLegacyScoreEvent(type, populatedMatch, ball) {
  return {
    type,
    matchId: populatedMatch._id.toString(),
    match: serializeMatch(populatedMatch),
    runs: ball?.runs || 0,
    isWicket: Boolean(ball?.isWicket),
    ball,
  };
}

// GET /api/matches - list all matches
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.format) filter.format = req.query.format;

    const matches = await getPopulateMatchQuery(filter).sort({ date: -1 });
    res.json(matches.map(serializeMatch));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/matches/:id - get match by id (full populate)
router.get('/:id', async (req, res) => {
  try {
    const match = await getPopulatedMatchById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(serializeMatch(match));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/matches - create match (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const payload = normalizeCreatePayload(req.body);
    let matchData;

    if (payload.teamA && payload.teamB) {
      const teamAPlayers = await ensurePlayers(payload.teamA.name, payload.teamA.players || []);
      const teamBPlayers = await ensurePlayers(payload.teamB.name, payload.teamB.players || []);

      matchData = {
        format: payload.format,
        venue: payload.venue,
        date: payload.date,
        toss: payload.toss,
        series: payload.series || undefined,
        status: 'upcoming',
        teams: [
          {
            name: payload.teamA.name,
            shortName: payload.teamA.shortName,
            players: teamAPlayers,
          },
          {
            name: payload.teamB.name,
            shortName: payload.teamB.shortName,
            players: teamBPlayers,
          },
        ],
      };
    } else {
      matchData = payload;
    }

    const match = new Match(matchData);

    const autoStart = resolveAutoStartConfig(match);
    if (autoStart) {
      match.innings = [buildInningsState(autoStart)];
      match.currentInnings = 0;
      match.status = 'live';
    }

    await match.save();

    if (match.series) {
      await Series.findByIdAndUpdate(match.series, { $addToSet: { matches: match._id } });
    }

    const populatedMatch = await getPopulatedMatchById(match._id);
    res.status(201).json(serializeMatch(populatedMatch));
  } catch (err) {
    res.status(400).json({ error: 'Error creating match: ' + err.message });
  }
});

// PUT /api/matches/:id - update match (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const populatedMatch = await getPopulatedMatchById(match._id);
    res.json(serializeMatch(populatedMatch));
  } catch (err) {
    res.status(400).json({ error: 'Error updating match: ' + err.message });
  }
});

// POST /api/matches/:id/start - start the match (admin only)
router.post('/:id/start', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status === 'live') {
      return res.status(400).json({ error: 'Match is already live' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match is already completed' });
    }

    const autoStart = resolveAutoStartConfig(match);
    const battingTeamRef = req.body?.battingTeam || autoStart?.battingTeam;
    const bowlingTeamRef = req.body?.bowlingTeam || autoStart?.bowlingTeam;
    const battingTeam = findTeam(match, battingTeamRef, 0);
    const bowlingTeam = findTeam(match, bowlingTeamRef, battingTeam?.name === match.teams?.[0]?.name ? 1 : 0);
    const striker = req.body?.striker || autoStart?.striker;
    const nonStriker = req.body?.nonStriker || autoStart?.nonStriker;
    const openingBowler = req.body?.openingBowler || autoStart?.openingBowler;

    if (!battingTeam || !bowlingTeam || !striker || !nonStriker || !openingBowler) {
      return res.status(400).json({
        error: 'Required: battingTeam, bowlingTeam, striker, nonStriker, openingBowler'
      });
    }

    match.innings = [buildInningsState({
      battingTeam: battingTeam.name,
      bowlingTeam: bowlingTeam.name,
      striker,
      nonStriker,
      openingBowler,
    })];
    match.currentInnings = 0;
    match.status = 'live';

    await match.save();

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);

    broadcastToMatch(match._id.toString(), {
      type: 'matchStarted',
      matchId: match._id.toString(),
      match: serializedMatch
    });

    res.json(serializedMatch);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/matches/:id/ball - THE MAIN SCORING ROUTE (admin only)
router.post('/:id/ball', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate('teams.players.player');
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'live') {
      return res.status(400).json({ error: 'Match is not live' });
    }

    const currentInningsIndex = match.currentInnings;
    const innings = match.innings[currentInningsIndex];

    if (!innings || innings.isCompleted) {
      return res.status(400).json({ error: 'Current innings is completed or not found' });
    }

    const battingTeam = findTeam(match, innings.battingTeam, 0);
    const bowlingTeam = findTeam(match, innings.bowlingTeam, 1);
    const legacyWide = Boolean(req.body?.isWide);
    const legacyNoBall = Boolean(req.body?.isNoBall);
    const normalizedExtras = req.body?.extras || (
      legacyWide
        ? { type: 'wide', runs: Math.max((req.body?.runs || 0) - 1, 0) }
        : legacyNoBall
          ? { type: 'noBall', runs: 0 }
          : null
    );
    const outBatsmanName = req.body?.outBatsman || req.body?.wicket?.outBatsman;
    const newBatsmanName = req.body?.newBatsman || req.body?.wicket?.newBatsman;
    const fielderName = req.body?.fielder || req.body?.wicket?.fielder;
    const legacyWicket = req.body?.isWicket
      ? {
          type: req.body?.dismissalType || req.body?.wicket?.type || 'Out',
          outBatsman: battingTeam?.players?.find((entry) => getPlayerName(entry.player) === outBatsmanName)?.player,
          newBatsman: battingTeam?.players?.find((entry) => getPlayerName(entry.player) === newBatsmanName)?.player
            || chooseNextBatsman(battingTeam, innings),
          fielder: bowlingTeam?.players?.find((entry) => getPlayerName(entry.player) === fielderName)?.player || null,
        }
      : null;
    const {
      runs = 0,
      extras = normalizedExtras,
      isWicket = false,
      wicket = legacyWicket,
      isBoundary = req.body?.isBoundary ?? [4, 6].includes(Number(req.body?.runs || 0)),
      newBowler = null
    } = req.body;

    const maxOvers = getMaxOvers(match.format);

    // Determine extras
    const isWide = extras && extras.type === 'wide';
    const isNoBall = extras && extras.type === 'noBall';
    const isBye = extras && extras.type === 'bye';
    const isLegBye = extras && extras.type === 'legBye';
    const extraRuns = extras ? (extras.runs || 0) : 0;

    let totalRunsThisBall = 0;
    let isLegalBall = true;
    let runsToStriker = 0;
    let runsToBowler = 0;
    let ballDescription = '';

    // --- Calculate runs based on delivery type ---
    if (isWide) {
      // Wide: 1 + extra runs (overthrows), all are extras
      totalRunsThisBall = 1 + extraRuns;
      runsToBowler = totalRunsThisBall;
      runsToStriker = 0;
      isLegalBall = false;
      innings.extras.wides += totalRunsThisBall;
      innings.extras.total += totalRunsThisBall;
      ballDescription = totalRunsThisBall === 1 ? 'Wide' : `Wide + ${extraRuns}`;
    } else if (isNoBall) {
      // No-ball: 1 for no-ball + batsman runs + extra runs
      const noBallPenalty = 1;
      runsToStriker = runs; // Batsman gets the runs off bat
      totalRunsThisBall = noBallPenalty + runs + extraRuns;
      runsToBowler = totalRunsThisBall;
      isLegalBall = false;
      innings.extras.noBalls += noBallPenalty;
      innings.extras.total += noBallPenalty + extraRuns;
      ballDescription = `No Ball + ${runs}`;
      if (extraRuns > 0) ballDescription += ` + ${extraRuns} extra`;
    } else if (isBye) {
      // Bye: runs are extras, not to batsman or bowler's conceded
      totalRunsThisBall = extraRuns;
      runsToStriker = 0;
      runsToBowler = 0; // Byes don't count against bowler
      isLegalBall = true;
      innings.extras.byes += extraRuns;
      innings.extras.total += extraRuns;
      ballDescription = `${extraRuns} Bye${extraRuns > 1 ? 's' : ''}`;
    } else if (isLegBye) {
      // Leg bye: runs are extras, not to batsman or bowler's conceded
      totalRunsThisBall = extraRuns;
      runsToStriker = 0;
      runsToBowler = 0; // Leg byes don't count against bowler
      isLegalBall = true;
      innings.extras.legByes += extraRuns;
      innings.extras.total += extraRuns;
      ballDescription = `${extraRuns} Leg Bye${extraRuns > 1 ? 's' : ''}`;
    } else {
      // Normal delivery
      totalRunsThisBall = runs;
      runsToStriker = runs;
      runsToBowler = runs;
      isLegalBall = true;

      if (runs === 0 && !isWicket) {
        ballDescription = 'Dot ball';
      } else if (runs === 4 && isBoundary) {
        ballDescription = 'FOUR!';
      } else if (runs === 6 && isBoundary) {
        ballDescription = 'SIX!';
      } else {
        ballDescription = `${runs} run${runs !== 1 ? 's' : ''}`;
      }
    }

    // --- Update innings total ---
    innings.runs += totalRunsThisBall;

    // --- Update striker's batting stats ---
    const striker = innings.currentBatsmen.striker;
    if (isLegalBall || isNoBall) {
      // Batsman faces the ball on legal deliveries and no-balls (not wides)
      if (!isWide) {
        striker.balls += 1;
      }
    }
    striker.runs += runsToStriker;

    if (runsToStriker === 4 && isBoundary) {
      striker.fours += 1;
    }
    if (runsToStriker === 6 && isBoundary) {
      striker.sixes += 1;
    }

    // Update batting scorecard entry for striker
    const strikerScorecard = innings.battingScorecard.find(
      b => b.player.toString() === striker.player.toString()
    );
    if (strikerScorecard) {
      strikerScorecard.runs = striker.runs;
      strikerScorecard.balls = striker.balls;
      strikerScorecard.fours = striker.fours;
      strikerScorecard.sixes = striker.sixes;
      strikerScorecard.strikeRate = striker.balls > 0
        ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(2))
        : 0;
    }

    // --- Update bowler's bowling stats ---
    const bowler = innings.currentBowler;
    runsToBowler && (bowler.runs += runsToBowler);

    if (isLegalBall) {
      bowler.balls += 1;

      // Check if over is complete (6 legal balls for this bowler spell)
      if (bowler.balls >= 6) {
        bowler.overs += 1;
        bowler.balls = 0;
      }
    }

    // Track dots, fours, sixes for bowler
    if (isLegalBall && runs === 0 && !extras && !isWicket) {
      // Update dot count in bowling scorecard
    }
    if (isBoundary && runs === 4) {
      // bowler fours
    }
    if (isBoundary && runs === 6) {
      // bowler sixes
    }

    // Update bowling scorecard entry
    const bowlerScorecard = innings.bowlingScorecard.find(
      b => b.player.toString() === bowler.player.toString()
    );
    if (bowlerScorecard) {
      bowlerScorecard.runs = bowler.runs;
      bowlerScorecard.overs = bowler.overs;
      bowlerScorecard.balls = bowler.balls;
      bowlerScorecard.wickets = bowler.wickets;

      // Calculate economy: runs / total overs bowled
      const totalBowlerOvers = bowlerScorecard.overs + (bowlerScorecard.balls / 6);
      bowlerScorecard.economy = totalBowlerOvers > 0
        ? parseFloat((bowlerScorecard.runs / totalBowlerOvers).toFixed(2))
        : 0;

      // Track dots
      if (isLegalBall && totalRunsThisBall === 0 && !isWicket) {
        bowlerScorecard.dots = (bowlerScorecard.dots || 0) + 1;
      }
      if (isBoundary && runs === 4) {
        bowlerScorecard.fours = (bowlerScorecard.fours || 0) + 1;
      }
      if (isBoundary && runs === 6) {
        bowlerScorecard.sixes = (bowlerScorecard.sixes || 0) + 1;
      }
    }

    // --- Update innings balls/overs (legal balls only) ---
    if (isLegalBall) {
      innings.balls += 1;
      if (innings.balls >= 6) {
        innings.overs += 1;
        innings.balls = 0;
      }
    }

    // --- Handle wicket ---
    if (isWicket && wicket) {
      innings.wickets += 1;
      bowler.wickets += 1;
      if (bowlerScorecard) {
        bowlerScorecard.wickets = bowler.wickets;
      }

      ballDescription = `WICKET! ${wicket.type || 'Out'}`;

      // Determine which batsman is out
      const outBatsmanId = wicket.outBatsman || striker.player.toString();

      // Update batting scorecard for out batsman
      const outBatsmanScorecard = innings.battingScorecard.find(
        b => b.player.toString() === outBatsmanId.toString()
      );
      if (outBatsmanScorecard) {
        outBatsmanScorecard.isOut = true;
        outBatsmanScorecard.dismissal = wicket.type || 'out';
        if ((wicket.type || '').toLowerCase() !== 'run out') {
          outBatsmanScorecard.bowler = bowler.player;
        }
        if (wicket.fielder) {
          outBatsmanScorecard.fielder = wicket.fielder;
        }
        outBatsmanScorecard.strikeRate = outBatsmanScorecard.balls > 0
          ? parseFloat(((outBatsmanScorecard.runs / outBatsmanScorecard.balls) * 100).toFixed(2))
          : 0;
      }

      // Add to fall of wickets
      innings.fallOfWickets.push({
        wicketNumber: innings.wickets,
        runs: innings.runs,
        overs: formatOvers(innings.overs, innings.balls),
        player: outBatsmanId
      });

      // Bring in new batsman
      if (wicket.newBatsman && innings.wickets < 10) {
        // Add new batsman to scorecard
        const existingEntry = innings.battingScorecard.find(
          b => b.player.toString() === wicket.newBatsman.toString()
        );
        if (!existingEntry) {
          innings.battingScorecard.push({
            player: wicket.newBatsman,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            isNotOut: false
          });
        }

        // Replace the out batsman in currentBatsmen
        if (outBatsmanId.toString() === striker.player.toString()) {
          innings.currentBatsmen.striker = {
            player: wicket.newBatsman,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
          };
        } else {
          innings.currentBatsmen.nonStriker = {
            player: wicket.newBatsman,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
          };
        }
      }
    }

    // --- Swap batsmen on odd runs (1, 3, 5...) ---
    // For normal deliveries, byes, leg byes: swap on odd runs
    // For wides: swap on odd total (which is rare but possible with overthrows)
    let effectiveRuns = totalRunsThisBall;
    if (isWide) {
      // For wides, swap if additional runs beyond the wide are odd
      effectiveRuns = extraRuns; // Only the runs actually run
    } else if (isNoBall) {
      effectiveRuns = runs + extraRuns; // Runs actually run
    } else if (isBye || isLegBye) {
      effectiveRuns = extraRuns;
    } else {
      effectiveRuns = runs;
    }

    if (effectiveRuns % 2 === 1 && !isWicket) {
      // Swap striker and non-striker
      const temp = innings.currentBatsmen.striker;
      innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
      innings.currentBatsmen.nonStriker = temp;
    }

    // Also handle run-out scenarios where the out batsman was running
    // and an odd number was completed - the swap may already be handled above

    // --- End of over handling ---
    let overComplete = false;
    if (isLegalBall && innings.balls === 0 && innings.overs > 0) {
      // Over just completed (balls wrapped to 0)
      overComplete = true;
    }
    // Special case: first ball of the match won't trigger this
    // Check using bowler's balls count
    if (isLegalBall && bowler.balls === 0 && bowler.overs > 0) {
      overComplete = true;
    }

    if (overComplete) {
      // Check for maiden over: last over in overHistory had 0 runs and no extras
      const currentOverBalls = innings.overHistory[innings.overHistory.length - 1] || [];
      const isThisOverCurrentBall = true; // We haven't added the ball yet
      // We'll check maiden after adding the ball to over history

      // Swap striker/non-striker at end of over
      const temp = innings.currentBatsmen.striker;
      innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
      innings.currentBatsmen.nonStriker = temp;

      // Set new bowler if provided
      if (newBowler || (req.body.wicket && req.body.wicket.newBowler)) {
        const nextBowlerId = newBowler || req.body.wicket.newBowler;
        // Check if this bowler already has a scorecard entry
        let existingBowlerEntry = innings.bowlingScorecard.find(
          b => b.player.toString() === nextBowlerId.toString()
        );
        if (!existingBowlerEntry) {
          innings.bowlingScorecard.push({
            player: nextBowlerId,
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0,
            dots: 0,
            fours: 0,
            sixes: 0
          });
          existingBowlerEntry = innings.bowlingScorecard[innings.bowlingScorecard.length - 1];
        }

        innings.currentBowler = {
          player: nextBowlerId,
          overs: existingBowlerEntry.overs,
          balls: existingBowlerEntry.balls,
          runs: existingBowlerEntry.runs,
          wickets: existingBowlerEntry.wickets,
          maidens: existingBowlerEntry.maidens
        };
      }

      // Start new over in overHistory
      innings.overHistory.push([]);
    }

    // --- Add ball to over history ---
    const ballDetail = {
      runs: totalRunsThisBall,
      extras: isWide ? 'wide' : isNoBall ? 'noBall' : isBye ? 'bye' : isLegBye ? 'legBye' : '',
      isWicket,
      description: ballDescription
    };

    const currentOverIndex = innings.overHistory.length - 1;
    if (currentOverIndex >= 0) {
      innings.overHistory[currentOverIndex].push(ballDetail);
    }

    // --- Check maiden over (after adding ball, when over is complete) ---
    if (overComplete && bowlerScorecard) {
      const completedOverIndex = innings.overHistory.length - 2; // Previous over (just completed)
      if (completedOverIndex >= 0) {
        const completedOver = innings.overHistory[completedOverIndex];
        const overRuns = completedOver.reduce((sum, b) => sum + b.runs, 0);
        if (overRuns === 0) {
          bowlerScorecard.maidens = (bowlerScorecard.maidens || 0) + 1;
          // Also update current bowler state if same bowler
          if (bowler.player.toString() === bowlerScorecard.player.toString()) {
            bowler.maidens = bowlerScorecard.maidens;
          }
        }
      }
    }

    // --- Check innings end conditions ---
    let inningsEnded = false;
    let endReason = '';

    // All out (10 wickets)
    if (innings.wickets >= 10) {
      inningsEnded = true;
      endReason = 'All out';
    }

    // Max overs reached (limited overs formats)
    if (maxOvers !== Infinity && innings.overs >= maxOvers && innings.balls === 0) {
      inningsEnded = true;
      endReason = 'Overs completed';
    }

    // Target reached (2nd innings chase)
    if (innings.target && innings.runs >= innings.target) {
      inningsEnded = true;
      endReason = 'Target reached';
    }

    if (inningsEnded) {
      innings.isCompleted = true;

      // Mark not-out batsmen
      innings.battingScorecard.forEach(b => {
        if (!b.isOut) {
          b.isNotOut = true;
          b.strikeRate = b.balls > 0
            ? parseFloat(((b.runs / b.balls) * 100).toFixed(2))
            : 0;
        }
      });
    }

    // --- Save match ---
    match.markModified('innings');
    await match.save();

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);
    const currentOverEventIndex = Math.max(innings.overHistory.length - 1, 0);
    const currentBallEventIndex = Math.max((innings.overHistory[currentOverEventIndex] || []).length - 1, 0);
    const normalizedBall = normalizeBall(ballDetail, currentOverEventIndex, currentBallEventIndex);

    broadcastToMatch(match._id.toString(), {
      ...buildLegacyScoreEvent('score_update', populatedMatch, normalizedBall),
      overComplete,
      inningsEnded,
      endReason,
    });

    res.json({
      match: serializedMatch,
      ball: normalizedBall,
      overComplete,
      inningsEnded,
      endReason
    });
  } catch (err) {
    console.error('Ball entry error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/matches/:id/end-innings - finalize current innings, set up next (admin only)
router.post('/:id/end-innings', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const currentInningsIndex = match.currentInnings;
    const currentInnings = match.innings[currentInningsIndex];

    if (!currentInnings) {
      return res.status(400).json({ error: 'No current innings found' });
    }

    // Mark current innings as completed
    currentInnings.isCompleted = true;

    // Mark not-out batsmen
    currentInnings.battingScorecard.forEach(b => {
      if (!b.isOut) {
        b.isNotOut = true;
        b.strikeRate = b.balls > 0
          ? parseFloat(((b.runs / b.balls) * 100).toFixed(2))
          : 0;
      }
    });

    const currentBattingTeam = findTeam(match, currentInnings.battingTeam, 0);
    const currentBowlingTeam = findTeam(match, currentInnings.bowlingTeam, 1);
    const nextBattingTeam = findTeam(match, req.body?.battingTeam, currentBowlingTeam?.name === match.teams?.[0]?.name ? 0 : 1)
      || currentBowlingTeam;
    const nextBowlingTeam = findTeam(match, req.body?.bowlingTeam, currentBattingTeam?.name === match.teams?.[0]?.name ? 0 : 1)
      || currentBattingTeam;
    const defaultOpeners = chooseOpeningBatsmen(nextBattingTeam);
    const battingTeam = nextBattingTeam?.name;
    const bowlingTeam = nextBowlingTeam?.name;
    const striker = req.body?.striker || defaultOpeners.striker;
    const nonStriker = req.body?.nonStriker || defaultOpeners.nonStriker;
    const openingBowler = req.body?.openingBowler || chooseOpeningBowler(nextBowlingTeam);

    if (!battingTeam || !bowlingTeam || !striker || !nonStriker || !openingBowler) {
      return res.status(400).json({
        error: 'Required: battingTeam, bowlingTeam, striker, nonStriker, openingBowler'
      });
    }

    const target = currentInnings.runs + 1;
    const nextInnings = buildInningsState({
      battingTeam,
      bowlingTeam,
      striker,
      nonStriker,
      openingBowler,
      target,
    });

    match.innings.push(nextInnings);
    match.currentInnings = match.innings.length - 1;

    match.markModified('innings');
    await match.save();

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);

    broadcastToMatch(match._id.toString(), {
      type: 'innings_change',
      matchId: match._id.toString(),
      match: serializedMatch,
      innings: match.currentInnings,
      target
    });

    res.json(serializedMatch);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/matches/:id/complete - complete the match and update player career stats (admin only)
router.post('/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const playerOfMatchName = req.body?.playerOfMatch || req.body?.playerOfTheMatch;
    const playerOfMatchRecord = playerOfMatchName
      ? await Player.findOne({ name: playerOfMatchName })
      : null;
    const playerOfMatchId = playerOfMatchRecord?._id || null;
    const summary = req.body?.summary || req.body?.result || '';
    const winner = req.body?.winner || (
      summary
        ? (match.teams.find((team) => summary.toLowerCase().includes(String(team.name || '').toLowerCase()))?.name || '')
        : ''
    );
    const margin = req.body?.margin || '';

    match.status = 'completed';
    match.result = {
      winner: winner || '',
      margin: margin || '',
      playerOfTheMatch: playerOfMatchId || null,
      summary: summary || ''
    };

    // Mark all innings as completed
    match.innings.forEach(inn => {
      inn.isCompleted = true;
      inn.battingScorecard.forEach(b => {
        if (!b.isOut) b.isNotOut = true;
      });
    });

    await match.save();

    // --- Update player career stats ---
    try {
      const playerUpdates = {};

      for (const innings of match.innings) {
        // Update batting stats
        for (const batEntry of innings.battingScorecard) {
          const pid = batEntry.player.toString();
          if (!playerUpdates[pid]) {
            playerUpdates[pid] = { batting: {}, bowling: {} };
          }
          const pu = playerUpdates[pid];
          if (!pu.batting.runs) {
            pu.batting = {
              matches: 0,
              innings: 0,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              highScore: 0,
              notOuts: 0,
              isBattingCounted: false
            };
          }
          pu.batting.innings += 1;
          pu.batting.runs += batEntry.runs;
          pu.batting.balls += batEntry.balls;
          pu.batting.fours += batEntry.fours;
          pu.batting.sixes += batEntry.sixes;
          if (batEntry.runs > pu.batting.highScore) {
            pu.batting.highScore = batEntry.runs;
          }
          if (batEntry.isNotOut) {
            pu.batting.notOuts += 1;
          }
        }

        // Update bowling stats
        for (const bowlEntry of innings.bowlingScorecard) {
          const pid = bowlEntry.player.toString();
          if (!playerUpdates[pid]) {
            playerUpdates[pid] = { batting: {}, bowling: {} };
          }
          const pu = playerUpdates[pid];
          if (!pu.bowling.wickets && pu.bowling.wickets !== 0) {
            pu.bowling = {
              innings: 0,
              runs: 0,
              balls: 0,
              wickets: 0,
              overs: 0,
              bestWickets: 0,
              bestRuns: Infinity,
              isBowlingCounted: false
            };
          }
          pu.bowling.innings += 1;
          pu.bowling.runs += bowlEntry.runs;
          pu.bowling.balls += (bowlEntry.overs * 6) + bowlEntry.balls;
          pu.bowling.overs += bowlEntry.overs;
          pu.bowling.wickets += bowlEntry.wickets;

          // Track best figures
          if (bowlEntry.wickets > pu.bowling.bestWickets ||
            (bowlEntry.wickets === pu.bowling.bestWickets && bowlEntry.runs < pu.bowling.bestRuns)) {
            pu.bowling.bestWickets = bowlEntry.wickets;
            pu.bowling.bestRuns = bowlEntry.runs;
          }
        }
      }

      // Get all unique player IDs involved in the match
      const allPlayerIds = Object.keys(playerUpdates);

      // Also collect all player IDs from team lists for match count
      const teamPlayerIds = new Set();
      for (const team of match.teams) {
        for (const tp of team.players) {
          teamPlayerIds.add(tp.player.toString());
        }
      }

      // Update each player in the database
      for (const pid of teamPlayerIds) {
        const player = await Player.findById(pid);
        if (!player) continue;

        // Increment match count
        player.batting.matches += 1;
        player.bowling.matches += 1;

        const updates = playerUpdates[pid];
        if (updates) {
          // Batting updates
          if (updates.batting && updates.batting.innings) {
            player.batting.innings += updates.batting.innings;
            player.batting.runs += updates.batting.runs;
            player.batting.balls += updates.batting.balls;
            player.batting.fours += updates.batting.fours;
            player.batting.sixes += updates.batting.sixes;
            player.batting.notOuts += updates.batting.notOuts;
            if (updates.batting.highScore > player.batting.highScore) {
              player.batting.highScore = updates.batting.highScore;
            }
            // Check for fifties and hundreds
            if (updates.batting.runs >= 100) {
              player.batting.hundreds += 1;
            } else if (updates.batting.runs >= 50) {
              player.batting.fifties += 1;
            }
          }

          // Bowling updates
          if (updates.bowling && updates.bowling.innings) {
            player.bowling.innings += updates.bowling.innings;
            player.bowling.runs += updates.bowling.runs;
            player.bowling.balls += updates.bowling.balls;
            player.bowling.wickets += updates.bowling.wickets;

            // Update best figures
            const currentBest = player.bowling.bestFigures.split('/');
            const currentBestWickets = parseInt(currentBest[0]) || 0;
            const currentBestRuns = parseInt(currentBest[1]) || Infinity;

            if (updates.bowling.bestWickets > currentBestWickets ||
              (updates.bowling.bestWickets === currentBestWickets && updates.bowling.bestRuns < currentBestRuns)) {
              player.bowling.bestFigures = `${updates.bowling.bestWickets}/${updates.bowling.bestRuns === Infinity ? 0 : updates.bowling.bestRuns}`;
            }

            // Five wicket hauls
            if (updates.bowling.bestWickets >= 5) {
              player.bowling.fiveWickets += 1;
            }

            // Update economy
            const totalBalls = player.bowling.balls;
            player.bowling.economy = totalBalls > 0
              ? parseFloat(((player.bowling.runs / totalBalls) * 6).toFixed(2))
              : 0;

            // Update overs
            player.bowling.overs = Math.floor(totalBalls / 6);
          }
        }

        await player.save();
      }
    } catch (statsErr) {
      console.error('Error updating player stats:', statsErr);
      // Don't fail the whole request for stats update failure
    }

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);

    broadcastToMatch(match._id.toString(), {
      type: 'match_completed',
      matchId: match._id.toString(),
      match: serializedMatch
    });

    res.json(serializedMatch);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

async function handleUndoBall(req, res) {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'live') {
      return res.status(400).json({ error: 'Match is not live' });
    }

    const currentInningsIndex = match.currentInnings;
    const innings = match.innings[currentInningsIndex];

    if (!innings) {
      return res.status(400).json({ error: 'No current innings found' });
    }

    // Find the last ball in over history
    let lastBall = null;
    let overIndex = innings.overHistory.length - 1;

    // If current over is empty, go to previous over
    while (overIndex >= 0 && innings.overHistory[overIndex].length === 0) {
      overIndex--;
    }

    if (overIndex < 0) {
      return res.status(400).json({ error: 'No balls to undo' });
    }

    const currentOver = innings.overHistory[overIndex];
    lastBall = currentOver[currentOver.length - 1];

    if (!lastBall) {
      return res.status(400).json({ error: 'No balls to undo' });
    }

    // Remove the last ball from over history
    currentOver.pop();

    // If this was in a new over (current over now empty and not the first over), remove it
    if (overIndex === innings.overHistory.length - 1 && currentOver.length === 0 && overIndex > 0) {
      // Check if we need to remove an empty over that was added at end of previous over
      // This is complex - we'll keep the over structure as is for simplicity
    }

    // Reverse the ball effects
    const wasWide = lastBall.extras === 'wide';
    const wasNoBall = lastBall.extras === 'noBall';
    const wasBye = lastBall.extras === 'bye';
    const wasLegBye = lastBall.extras === 'legBye';
    const wasLegalBall = !wasWide && !wasNoBall;

    // Subtract runs from innings total
    innings.runs -= lastBall.runs;

    // Reverse extras
    if (wasWide) {
      innings.extras.wides -= lastBall.runs;
      innings.extras.total -= lastBall.runs;
    } else if (wasNoBall) {
      // No-ball penalty is 1, rest are runs
      innings.extras.noBalls -= 1;
      innings.extras.total -= 1; // Just the penalty portion
    } else if (wasBye) {
      innings.extras.byes -= lastBall.runs;
      innings.extras.total -= lastBall.runs;
    } else if (wasLegBye) {
      innings.extras.legByes -= lastBall.runs;
      innings.extras.total -= lastBall.runs;
    }

    // Reverse legal ball count
    if (wasLegalBall) {
      if (innings.balls === 0 && innings.overs > 0) {
        innings.overs -= 1;
        innings.balls = 5;
      } else if (innings.balls > 0) {
        innings.balls -= 1;
      }
    }

    // Reverse wicket
    if (lastBall.isWicket) {
      innings.wickets -= 1;

      // Remove last fall of wicket
      if (innings.fallOfWickets.length > 0) {
        innings.fallOfWickets.pop();
      }

      // Note: fully reversing batsman swap-in is complex
      // For a complete undo, the client should refresh the match state
    }

    // Un-complete innings if it was auto-completed
    innings.isCompleted = false;

    match.markModified('innings');
    await match.save();

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);

    broadcastToMatch(match._id.toString(), {
      type: 'undo_ball',
      matchId: match._id.toString(),
      match: serializedMatch
    });

    res.json(serializedMatch);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

// POST /api/matches/:id/undo-ball - undo the last ball entry (admin only)
router.post('/:id/undo-ball', auth, adminOnly, handleUndoBall);

// POST /api/matches/:id/bowler - switch current bowler (admin only)
router.post('/:id/bowler', auth, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate('teams.players.player');
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const innings = match.innings[match.currentInnings];
    if (!innings) {
      return res.status(400).json({ error: 'No current innings found' });
    }

    const bowlingTeam = findTeam(match, innings.bowlingTeam, 1);
    const bowlerName = req.body?.bowlerName;
    const bowlerId = req.body?.bowlerId
      || bowlingTeam?.players?.find((entry) => getPlayerName(entry.player) === bowlerName)?.player;

    if (!bowlerId) {
      return res.status(400).json({ error: 'Valid bowler is required' });
    }

    let bowlerEntry = innings.bowlingScorecard.find(
      (entry) => getObjectId(entry.player) === getObjectId(bowlerId)
    );

    if (!bowlerEntry) {
      innings.bowlingScorecard.push(createBowlingEntry(bowlerId));
      bowlerEntry = innings.bowlingScorecard[innings.bowlingScorecard.length - 1];
    }

    innings.currentBowler = {
      player: bowlerId,
      overs: bowlerEntry.overs,
      balls: bowlerEntry.balls,
      runs: bowlerEntry.runs,
      wickets: bowlerEntry.wickets,
      maidens: bowlerEntry.maidens,
    };

    match.markModified('innings');
    await match.save();

    const populatedMatch = await getPopulatedMatchById(match._id);
    const serializedMatch = serializeMatch(populatedMatch);

    broadcastToMatch(match._id.toString(), {
      type: 'bowler_change',
      matchId: match._id.toString(),
      match: serializedMatch
    });

    res.json(serializedMatch);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Legacy alias for the current client
router.post('/:id/undo', auth, adminOnly, handleUndoBall);

module.exports = router;
