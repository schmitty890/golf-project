import mongoose from 'mongoose';

const stringSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('String', stringSchema);
