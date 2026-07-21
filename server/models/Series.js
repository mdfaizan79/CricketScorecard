const mongoose = require('mongoose');

const pointsTableEntrySchema = new mongoose.Schema({
  team: { type: String },
  played: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  tied: { type: Number, default: 0 },
  noResult: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  nrr: { type: Number, default: 0 }
}, { _id: false });

const seriesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Series name is required'],
    trim: true
  },
  format: { type: String, trim: true },
  teams: [{ type: String }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  pointsTable: [pointsTableEntrySchema],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming'
  },
  startDate: { type: Date },
  endDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);
