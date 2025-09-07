import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  getLessons, 
  getLesson, 
  createLesson, 
  updateLesson, 
  deleteLesson 
} from '../controllers/lessonController';
import { createLessonSchema, updateLessonSchema } from '../validators/lessonValidator';
import { verifyJWT } from '../middleware/verifyJWT';
import { authorize } from '../middleware/authorize';
import { rateLimitByIP, rateLimitByAPIKey } from '../middleware/rateLimit';
import { Env, UserJWTPayload } from '../types';

const lessons = new Hono<{ Bindings: Env; Variables: { user: UserJWTPayload } }>();

// Apply rate limiting to all lesson routes
lessons.use('*', rateLimitByIP);
lessons.use('*', rateLimitByAPIKey);

// Apply JWT verification to all routes
lessons.use('*', verifyJWT);

// GET /courses/:courseId/lessons - List all lessons for a course (admin, teacher, student)
lessons.get('/:courseId/lessons', authorize(['admin', 'teacher', 'student']), getLessons);

// GET /courses/:courseId/lessons/:lessonId - Get specific lesson (admin, teacher, student)
lessons.get('/:courseId/lessons/:lessonId', authorize(['admin', 'teacher', 'student']), getLesson);

// POST /courses/:courseId/lessons - Create lesson (admin, teacher)
lessons.post(
  '/:courseId/lessons',
  authorize(['admin', 'teacher']),
  zValidator('json', createLessonSchema),
  createLesson
);

// PUT /courses/:courseId/lessons/:lessonId - Update lesson (admin, teacher)
lessons.put(
  '/:courseId/lessons/:lessonId',
  authorize(['admin', 'teacher']),
  zValidator('json', updateLessonSchema),
  updateLesson
);

// DELETE /courses/:courseId/lessons/:lessonId - Delete lesson (admin only)
lessons.delete('/:courseId/lessons/:lessonId', authorize(['admin']), deleteLesson);

export default lessons;
