const mongoose = require('mongoose');

const ballSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  extras: { type: String, default: '' },
  isWicket: { type: Boolean, default: false },
  description: { type: String, default: '' }
}, { _id: false });

const batsmanScorecardSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  dismissal: { type: String, default: '' },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  isOut: { type: Boolean, default: false },
  isNotOut: { type: Boolean, default: false }
}, { _id: false });

const bowlerScorecardSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  economy: { type: Number, default: 0 },
  dots: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 }
}, { _id: false });

const fallOfWicketSchema = new mongoose.Schema({
  wicketNumber: { type: Number },
  runs: { type: Number },
  overs: { type: String },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
}, { _id: false });

const currentBatsmanSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 }
}, { _id: false });

const currentBowlerSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 }
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  battingTeam: { type: String },
  bowlingTeam: { type: String },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  target: { type: Number },
  currentBatsmen: {
    striker: currentBatsmanSchema,
    nonStriker: currentBatsmanSchema
  },
  currentBowler: currentBowlerSchema,
  battingScorecard: [batsmanScorecardSchema],
  bowlingScorecard: [bowlerScorecardSchema],
  fallOfWickets: [fallOfWicketSchema],
  overHistory: [[ballSchema]],
  isCompleted: { type: Boolean, default: false }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  format: {
    type: String,
    enum: ['T20', 'ODI', 'Test'],
    required: [true, 'Match format is required']
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  venue: { type: String, trim: true },
  date: { type: Date },
  teams: [{
    name: { type: String },
    shortName: { type: String },
    players: [{
      player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      role: { type: String }
    }]
  }],
  toss: {
    winner: { type: String },
    decision: { type: String, enum: ['bat', 'bowl'] }
  },
  innings: [inningsSchema],
  currentInnings: { type: Number, default: 0 },
  result: {
    winner: { type: String },
    margin: { type: String },
    playerOfTheMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    summary: { type: String }
  },
  series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series' },
  isSuperOver: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
