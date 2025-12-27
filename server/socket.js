import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

/**
 * Initialize Socket.io server with Express HTTP server
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const { token } = socket.handshake.auth;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // eslint-disable-next-line no-param-reassign
      socket.userId = decoded.userId;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`User connected: ${socket.userId}`);

    // Join a round's room
    socket.on('join-round', (roundId) => {
      socket.join(`round:${roundId}`);
      // eslint-disable-next-line no-console
      console.log(`User ${socket.userId} joined room round:${roundId}`);
    });

    // Leave a round's room
    socket.on('leave-round', (roundId) => {
      socket.leave(`round:${roundId}`);
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

/**
 * Get the Socket.io server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit a score update to all clients in a round's room
 */
const emitScoreUpdate = (roundId, data) => {
  if (io) {
    io.to(`round:${roundId}`).emit('score-update', data);
  }
};

/**
 * Emit player joined event to all clients in a round's room
 */
const emitPlayerJoined = (roundId, data) => {
  if (io) {
    io.to(`round:${roundId}`).emit('player-joined', data);
  }
};

/**
 * Emit player removed event to all clients in a round's room
 */
const emitPlayerRemoved = (roundId, data) => {
  if (io) {
    io.to(`round:${roundId}`).emit('player-removed', data);
  }
};

export {
  initSocket,
  getIO,
  emitScoreUpdate,
  emitPlayerJoined,
  emitPlayerRemoved,
};
