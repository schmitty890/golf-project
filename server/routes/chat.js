/* eslint-disable no-underscore-dangle */
import express from 'express';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';

const router = express.Router();

// Admin: list conversations (most recent first) for the chat dashboard's initial load. Live updates
// then arrive over the socket.
router.get('/conversations', auth, requireAdmin, async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .lean();
    return res.json(conversations.map((c) => ({
      id: String(c._id),
      customerName: c.customerName || (c.user ? 'Customer' : 'Guest'),
      customerEmail: c.customerEmail || '',
      lastMessageText: c.lastMessageText || '',
      lastMessageAt: c.lastMessageAt,
      unreadForAdmin: c.unreadForAdmin || 0,
      isGuest: !c.user,
    })));
  } catch (error) {
    console.error('List conversations error:', error);
    return res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// Admin: full message history for one conversation.
router.get('/conversations/:id/messages', auth, requireAdmin, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ conversation: req.params.id })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    return res.json(messages.map((m) => ({
      id: String(m._id), from: m.from, text: m.text, createdAt: m.createdAt,
    })));
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
});

export default router;
