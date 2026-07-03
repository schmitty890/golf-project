import mongoose from 'mongoose';

// One live-chat thread per customer. Logged-in customers are keyed by `user`; guests by an
// unguessable `guestId` they hold in localStorage (same privacy idea as an order trackingToken).
// `unreadForAdmin` powers the admin badge; `lastMessage*` powers the conversation list preview.
const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true,
  },
  guestId: { type: String, default: '', index: true },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },
  lastMessageText: { type: String, default: '' },
  unreadForAdmin: { type: Number, default: 0 },
  // When we last emailed the owner (+ posted an away auto-reply) because a message arrived while no
  // admin was watching. Throttles both so a burst of messages doesn't spam. See socket/chat.js.
  lastAdminAlertAt: { type: Date, default: null },
  closed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);
