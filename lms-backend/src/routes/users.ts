import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  getUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/userController';
import { createUserSchema, updateUserSchema } from '../validators/userValidator';
import { verifyJWT } from '../middleware/verifyJWT';
import { authorize } from '../middleware/authorize';
import { rateLimitByIP, rateLimitByAPIKey } from '../middleware/rateLimit';
import { Env, UserJWTPayload } from '../types';

const users = new Hono<{ Bindings: Env; Variables: { user: UserJWTPayload } }>();

// Apply rate limiting to all user routes
users.use('*', rateLimitByIP);
users.use('*', rateLimitByAPIKey);

// Apply JWT verification to all routes
users.use('*', verifyJWT);

// GET /users - List all users (admin only)
users.get('/', authorize(['admin']), getUsers);

// GET /users/:id - Get specific user
users.get('/:id', authorize(['admin', 'teacher', 'student']), getUser);

// POST /users - Create user (admin only)
users.post(
  '/',
  authorize(['admin']),
  zValidator('json', createUserSchema),
  createUser
);

// PUT /users/:id - Update user
users.put(
  '/:id',
  authorize(['admin', 'teacher', 'student']),
  zValidator('json', updateUserSchema),
  updateUser
);

// DELETE /users/:id - Delete user (admin only)
users.delete('/:id', authorize(['admin']), deleteUser);

export default users;
