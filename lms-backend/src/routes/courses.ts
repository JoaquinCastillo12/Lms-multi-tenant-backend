import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  getCourses, 
  getCourse, 
  createCourse, 
  updateCourse, 
  deleteCourse 
} from '../controllers/courseController';
import { createCourseSchema, updateCourseSchema } from '../validators/couseValidator';
import { verifyJWT } from '../middleware/verifyJWT';
import { authorize } from '../middleware/authorize';
import { rateLimitByIP, rateLimitByAPIKey } from '../middleware/rateLimit';
import { Env, UserJWTPayload } from '../types';

const courses = new Hono<{ Bindings: Env; Variables: { user: UserJWTPayload } }>();

// Apply rate limiting to all course routes
courses.use('*', rateLimitByIP);
courses.use('*', rateLimitByAPIKey);

// Apply JWT verification to all routes
courses.use('*', verifyJWT);

// GET /courses - List all courses (admin, teacher, student)
courses.get('/', authorize(['admin', 'teacher', 'student']), getCourses);

// GET /courses/:id - Get specific course (admin, teacher, student)
courses.get('/:id', authorize(['admin', 'teacher', 'student']), getCourse);

// POST /courses - Create course (admin, teacher)
courses.post(
  '/',
  authorize(['admin', 'teacher']),
  zValidator('json', createCourseSchema),
  createCourse
);

// PUT /courses/:id - Update course (admin, teacher)
courses.put(
  '/:id',
  authorize(['admin', 'teacher']),
  zValidator('json', updateCourseSchema),
  updateCourse
);

// DELETE /courses/:id - Delete course (admin only)
courses.delete('/:id', authorize(['admin']), deleteCourse);

export default courses;
