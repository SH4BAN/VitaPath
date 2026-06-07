import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { createMessage } from './services/message.service.js';

export function attachRealtime(server, app) {
  const io = new Server(server, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Socket authentication token is required');
      const payload = jwt.verify(token, env.jwtSecret);
      const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [payload.sub]);
      if (!rows[0]) throw new Error('User no longer exists');
      socket.user = rows[0];
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.emit('chat:connected', { userId: socket.user.id });

    socket.on('message:send', async (payload, callback) => {
      try {
        const body = String(payload?.body || '').trim();
        if (!body) throw new Error('Message body is required');
        const message = await createMessage({
          sender: socket.user,
          recipientId: payload.recipientId,
          childId: payload.childId || null,
          body,
        });
        io.to(`user:${payload.recipientId}`).emit('message:new', message);
        io.to(`user:${socket.user.id}`).emit('message:new', message);
        callback?.({ ok: true, message });
      } catch (error) {
        callback?.({ ok: false, error: error.message });
      }
    });
  });

  app.set('io', io);
  return io;
}
