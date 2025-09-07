import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  status: z.enum(['draft', 'published'], {
    errorMap: () => ({ message: 'Status must be either draft or published' }),
  }),
  course_id: z.string().nanoid('Invalid course ID'),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  status: z.enum(['draft', 'published'], {
    errorMap: () => ({ message: 'Status must be either draft or published' }),
  }).optional(),
});

export type CreateLessonRequest = z.infer<typeof createLessonSchema>;
export type UpdateLessonRequest = z.infer<typeof updateLessonSchema>;
