import mongoose from 'mongoose';

const holeSchema = new mongoose.Schema({
  holeNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 18,
  },
  par: {
    type: Number,
    required: true,
    min: 3,
    max: 5,
  },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  scores: {
    type: [Number],
    default: [],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { _id: false });

const roundSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  holes: {
    type: [holeSchema],
    validate: {
      validator(v) {
        return v.length === 9 || v.length === 18;
      },
      message: 'Round must have 9 or 18 holes',
    },
  },
  players: {
    type: [playerSchema],
    validate: {
      validator(v) {
        return v.length >= 1 && v.length <= 4;
      },
      message: 'Round must have 1 to 4 players',
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shareCode: {
    type: String,
    unique: true,
    sparse: true,
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('Round', roundSchema);
