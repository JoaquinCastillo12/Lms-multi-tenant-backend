import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { login, refresh, logout } from '../controllers/authController';
import { loginSchema, refreshTokenSchema } from '../validators/authValidator';
import { rateLimitByIP } from '../middleware/rateLimit';
import { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// Apply rate limiting to all auth routes
auth.use('*', rateLimitByIP);

// POST /auth/login
auth.post(
  '/login',
  zValidator('json', loginSchema),
  login
);

// POST /auth/refresh
auth.post(
  '/refresh',
  zValidator('json', refreshTokenSchema),
  refresh
);

// POST /auth/logout
auth.post('/logout', logout);



export default auth;
