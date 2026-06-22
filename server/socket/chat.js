/* eslint-disable no-underscore-dangle, no-param-reassign */
// Real-time live chat over socket.io. Privacy model: each conversation is its own room
// (`conv:<conversationId>`); a customer can ONLY join the room for their own conversation (the
// server derives it from their authenticated userId or guestId — never from client input). The
// owner joins the shared `admin` room and explicitly opens individual conversations to reply.
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';

const ADMIN_ROOM = 'admin';
const MAX_LEN = 2000;
const HISTORY_LIMIT = 50;

const convRoom = (id) => `conv:${id}`;
const clean = (t) => String(t || '').slice(0, MAX_LEN).trim();
const shape = (m) => ({
  id: String(m._id), from: m.from, text: m.text, createdAt: m.createdAt,
});

// Find (or create) the one conversation belonging to this socket's customer.
async function getOrCreateConversation(socket) {
  const { userId, guestId } = socket.data;
  let convo = userId
    ? await Conversation.findOne({ user: userId })
    : await Conversation.findOne({ guestId });
  if (!convo) {
    convo = await Conversation.create(userId ? { user: userId } : { guestId });
  }
  return convo;
}

async function setChatAvailable(available) {
  await Settings.findOneAndUpdate(
    { key: 'availability' },
    { $set: { 'chat.available': available } },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

export default function initChat(io) {
  // Authenticate the connection: a JWT marks a logged-in customer/admin; otherwise it's a guest
  // identified by an unguessable guestId the client persists in localStorage.
  io.use(async (socket, next) => {
    const { token, guestId } = socket.handshake.auth || {};
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('role firstName lastName email');
        if (user) {
          socket.data.userId = String(user._id);
          socket.data.role = user.role;
          socket.data.name = [user.firstName, user.lastName].filter(Boolean).join(' ');
          socket.data.email = user.email;
          return next();
        }
      }
    } catch {
      // fall through to guest
    }
    if (!guestId) return next(new Error('No identity'));
    socket.data.guestId = String(guestId);
    return next();
  });

  io.on('connection', async (socket) => {
    const isAdmin = socket.data.role === 'admin';

    if (isAdmin) {
      socket.join(ADMIN_ROOM);

      // Open a specific conversation: join its room, send history, clear its unread.
      socket.on('admin:join', async ({ conversationId }) => {
        if (!conversationId) return;
        socket.join(convRoom(conversationId));
        const messages = await ChatMessage.find({ conversation: conversationId })
          .sort({ createdAt: 1 }).limit(HISTORY_LIMIT).lean();
        socket.emit('chat:history', { conversationId, messages: messages.map(shape) });
        await Conversation.findByIdAndUpdate(conversationId, { unreadForAdmin: 0 });
        await ChatMessage.updateMany({ conversation: conversationId, from: 'customer' }, { readByAdmin: true });
        io.to(ADMIN_ROOM).emit('chat:read', { conversationId });
      });

      socket.on('admin:send', async ({ conversationId, text }) => {
        const body = clean(text);
        if (!conversationId || !body) return;
        const msg = await ChatMessage.create({ conversation: conversationId, from: 'agent', text: body });
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: msg.createdAt, lastMessageText: body, unreadForAdmin: 0,
        });
        io.to(convRoom(conversationId)).emit('chat:message', { conversationId, message: shape(msg) });
      });

      socket.on('admin:markRead', async ({ conversationId }) => {
        if (!conversationId) return;
        await Conversation.findByIdAndUpdate(conversationId, { unreadForAdmin: 0 });
        io.to(ADMIN_ROOM).emit('chat:read', { conversationId });
      });

      socket.on('disconnect', () => {
        // When the last admin tab closes, flip availability off so the green dot can't lie.
        const room = io.sockets.adapter.rooms.get(ADMIN_ROOM);
        if (!room || room.size === 0) setChatAvailable(false).catch(() => {});
      });
      return;
    }

    // ---- Customer (logged-in or guest) ----
    const convo = await getOrCreateConversation(socket);
    socket.data.conversationId = String(convo._id);
    socket.join(convRoom(convo._id));
    const history = await ChatMessage.find({ conversation: convo._id })
      .sort({ createdAt: 1 }).limit(HISTORY_LIMIT).lean();
    socket.emit('chat:history', { conversationId: String(convo._id), messages: history.map(shape) });

    socket.on('chat:send', async ({ text }) => {
      const body = clean(text);
      if (!body) return;
      const msg = await ChatMessage.create({ conversation: convo._id, from: 'customer', text: body });
      // Capture the customer's identity on the conversation for the admin list.
      const name = socket.data.name || '';
      const email = socket.data.email || '';
      await Conversation.findByIdAndUpdate(convo._id, {
        lastMessageAt: msg.createdAt,
        lastMessageText: body,
        $inc: { unreadForAdmin: 1 },
        ...(name ? { customerName: name } : {}),
        ...(email ? { customerEmail: email } : {}),
      });
      io.to(convRoom(convo._id)).emit('chat:message', { conversationId: String(convo._id), message: shape(msg) });
      io.to(ADMIN_ROOM).emit('chat:notify', {
        conversationId: String(convo._id),
        preview: body.slice(0, 120),
        customerName: name || (socket.data.userId ? 'Customer' : 'Guest'),
        at: msg.createdAt,
      });
    });
  });
}
