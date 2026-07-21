const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  team: {
    type: String,
    required: [true, 'Team is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
    default: 'Batsman'
  },
  jerseyNumber: {
    type: Number,
    min: 0,
    max: 999,
    default: null
  },
  batting: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 }
  },
  bowling: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    bestFigures: { type: String, default: '0/0' },
    fiveWickets: { type: Number, default: 0 }
  },
  image: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
