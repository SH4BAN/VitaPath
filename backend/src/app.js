import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import childRoutes from './routes/children.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import messageRoutes from './routes/messages.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import riskRoutes from './routes/risk.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import userRoutes from './routes/users.routes.js';
import visitRoutes from './routes/visits.routes.js';
import chatRoutes from './routes/chat.routes.js';
import passportRoutes from './routes/passport.routes.js';
import municipalityRoutes from './routes/municipality.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../../../dist');
const isProd = existsSync(distDir);

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SAFE backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/children', childRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/municipality', municipalityRoutes);

if (isProd) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.use(notFoundHandler);
}

app.use(errorHandler);
