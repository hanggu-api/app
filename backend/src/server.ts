import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setIO, redis } from './platform';
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
import chatRoutes from './routes/chat';
import mediaRoutes from './routes/media';
import { authMiddleware } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
setIO(io);

io.on('connection', (socket) => {
  socket.on('auth', (payload: { userId: number }) => {
    if (payload?.userId) {
      socket.join(`user:${payload.userId}`);
      redis.sadd('presence:online_users', String(payload.userId));
      redis.set(`presence:user:${payload.userId}`, 'online', 'EX', 300);
    }
  });
  socket.on('join:service', (serviceId: string) => {
    if (serviceId) socket.join(`service:${serviceId}`);
    const uidRooms = Array.from(socket.rooms).filter((r) => r.startsWith('user:'));
    const uid = uidRooms.length ? Number(uidRooms[0].split(':')[1]) : null;
    if (uid) {
      redis.sadd(`presence:service:${serviceId}`, String(uid));
    }
  });
  socket.on('disconnect', async () => {
    const uidRooms = Array.from(socket.rooms).filter((r) => r.startsWith('user:'));
    const uid = uidRooms.length ? Number(uidRooms[0].split(':')[1]) : null;
    if (uid) {
      await redis.del(`presence:user:${uid}`);
      await redis.srem('presence:online_users', String(uid));
    }
  });
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const API_PREFIX = (process.env.API_PREFIX || '/api').replace(/\/+$/, '') || '';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/services`, serviceRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/media`, mediaRoutes);

app.get('/', (req, res) => {
    res.send('Conserta+ API Running (MySQL)');
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ ok: true });
});

app.get(`${API_PREFIX}/presence/:userId`, async (req, res) => {
  const userId = req.params.userId;
  try {
    const online = await redis.get(`presence:user:${userId}`);
    res.json({ success: true, online: !!online });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Presence check failed' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
