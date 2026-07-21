const express = require('express');
const Player = require('../models/Player');
const { auth, adminOnly } = require('../middleware/auth');
const { serializePlayer } = require('../utils/serializers');

const router = express.Router();

// GET /api/players - list all players, optional ?team= filter
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.team) {
      filter.team = req.query.team;
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const players = await Player.find(filter).sort({ name: 1 });
    res.json(players.map(serializePlayer));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/players/:id - get player by id
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(serializePlayer(player));
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/players/:id/stats - aggregated stats
router.get('/:id/stats', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const battingAvg = player.batting.innings > 0
      ? (player.batting.runs / (player.batting.innings - player.batting.notOuts || 1)).toFixed(2)
      : 0;

    const battingSR = player.batting.balls > 0
      ? ((player.batting.runs / player.batting.balls) * 100).toFixed(2)
      : 0;

    const bowlingAvg = player.bowling.wickets > 0
      ? (player.bowling.runs / player.bowling.wickets).toFixed(2)
      : 0;

    const bowlingSR = player.bowling.wickets > 0
      ? (player.bowling.balls / player.bowling.wickets).toFixed(2)
      : 0;

    const economy = player.bowling.balls > 0
      ? ((player.bowling.runs / player.bowling.balls) * 6).toFixed(2)
      : 0;

    res.json({
      player,
      aggregatedStats: {
        batting: {
          average: parseFloat(battingAvg),
          strikeRate: parseFloat(battingSR),
          matches: player.batting.matches,
          innings: player.batting.innings,
          runs: player.batting.runs,
          highScore: player.batting.highScore,
          fours: player.batting.fours,
          sixes: player.batting.sixes,
          fifties: player.batting.fifties,
          hundreds: player.batting.hundreds,
          notOuts: player.batting.notOuts
        },
        bowling: {
          average: parseFloat(bowlingAvg),
          strikeRate: parseFloat(bowlingSR),
          economy: parseFloat(economy),
          matches: player.bowling.matches,
          innings: player.bowling.innings,
          wickets: player.bowling.wickets,
          runs: player.bowling.runs,
          bestFigures: player.bowling.bestFigures,
          fiveWickets: player.bowling.fiveWickets
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/players - create player (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.status(201).json(serializePlayer(player));
  } catch (err) {
    res.status(400).json({ error: 'Error creating player: ' + err.message });
  }
});

// PUT /api/players/:id - update player (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(serializePlayer(player));
  } catch (err) {
    res.status(400).json({ error: 'Error updating player: ' + err.message });
  }
});

module.exports = router;
