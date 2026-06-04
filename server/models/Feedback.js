import mongoose from 'mongoose';

// Customer review/feedback. Submitted by anyone (guests included) and held as 'pending'
// until an admin approves it; only approved feedback is shown publicly.
const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number, required: true, min: 1, max: 5,
  },
  comment: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  // Optional location/detail, e.g. "The Vineyards resident".
  location: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  // Linked account when the submitter was logged in; null for guests.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
