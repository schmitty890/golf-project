import mongoose from 'mongoose';

// A single live-chat message. `from` is 'customer' or 'agent' (the owner). Ordered by createdAt.
const chatMessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true,
  },
  from: { type: String, enum: ['customer', 'agent'], required: true },
  text: { type: String, required: true },
  readByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
