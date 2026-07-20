import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import authRouter from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import settingsRouter from './routes/settings.js';
import feedbackRouter from './routes/feedback.js';
import promosRouter from './routes/promos.js';
import contactRouter from './routes/contact.js';
import customersRouter from './routes/customers.js';
import inventoryRouter from './routes/inventory.js';
import analyticsRouter from './routes/analytics.js';
import chatRouter from './routes/chat.js';
import giveawayRouter from './routes/giveaway.js';
import newsletterRouter from './routes/newsletter.js';
import initChat from './socket/chat.js';
import { startReminderJob } from './jobs/reminders.js';
import stripeWebhook from './routes/stripeWebhook.js';
import { swaggerUi, specs } from './swagger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

// Live-chat realtime layer. CORS origin is the client app; '*' in dev when CLIENT_URL is unset.
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || process.env.SITE_URL || '*' },
});
initChat(io);

// Middleware
app.use(cors());
// Stripe webhook needs the RAW body for signature verification — must be registered BEFORE the
// global express.json() so it isn't parsed away.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    startReminderJob(); // evening-before reminder emails
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/promos', promosRouter);
app.use('/api/contact', contactRouter);
app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/giveaway', giveawayRouter);
app.use('/api/newsletter', newsletterRouter);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
