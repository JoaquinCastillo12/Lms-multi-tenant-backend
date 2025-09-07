import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  instructor_user_id: z.string().length(21, 'Invalid instructor ID'), // nanoid tiene 21 caracteres
});

export const updateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  instructor_user_id: z.string().length(21, 'Invalid instructor ID').optional(),
});

export type CreateCourseRequest = z.infer<typeof createCourseSchema>;
export type UpdateCourseRequest = z.infer<typeof updateCourseSchema>;

