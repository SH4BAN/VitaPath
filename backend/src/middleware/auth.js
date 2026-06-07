import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      const error = new Error('Authentication token is required');
      error.status = 401;
      throw error;
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const { rows } = await query('SELECT id, name, email, role, municipality FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) {
      const error = new Error('User no longer exists');
      error.status = 401;
      throw error;
    }

    req.user = rows[0];
    next();
  } catch (error) {
    error.status = error.status || 401;
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      const error = new Error('You do not have permission to access this resource');
      error.status = 403;
      return next(error);
    }
    return next();
  };
}
