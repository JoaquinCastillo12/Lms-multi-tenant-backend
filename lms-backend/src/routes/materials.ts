import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  getMaterials, 
  getMaterial, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial 
} from '../controllers/materialController';
import { createMaterialSchema, updateMaterialSchema } from '../validators/materialValidator';
import { verifyJWT } from '../middleware/verifyJWT';
import { authorize } from '../middleware/authorize';
import { rateLimitByIP, rateLimitByAPIKey } from '../middleware/rateLimit';
import { Env, UserJWTPayload } from '../types';

const materials = new Hono<{ Bindings: Env; Variables: { user: UserJWTPayload } }>();

// Apply rate limiting to all material routes
materials.use('*', rateLimitByIP);
materials.use('*', rateLimitByAPIKey);

// Apply JWT verification to all routes
materials.use('*', verifyJWT);

// GET /materials - List all materials (optionally filtered by lesson_id)
materials.get('/', authorize(['admin', 'teacher', 'student']), getMaterials);

// GET /materials/:id - Get specific material
materials.get('/:id', authorize(['admin', 'teacher', 'student']), getMaterial);

// POST /materials - Create material
materials.post(
  '/',
  authorize(['admin', 'teacher']),
  zValidator('json', createMaterialSchema),
  createMaterial
);

// PUT /materials/:id - Update material
materials.put(
  '/:id',
  authorize(['admin', 'teacher']),
  zValidator('json', updateMaterialSchema),
  updateMaterial
);

// DELETE /materials/:id - Delete material
materials.delete('/:id', authorize(['admin', 'teacher']), deleteMaterial);

export default materials;
