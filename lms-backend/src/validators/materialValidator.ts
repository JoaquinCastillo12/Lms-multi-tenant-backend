import { z } from 'zod';

export const createMaterialSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  url_r2: z.string().url('Invalid URL format'),
  lesson_id: z.string().min(1, 'Lesson ID is required'),
});

export const updateMaterialSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long').optional(),
  url_r2: z.string().url('Invalid URL format').optional(),
});

export type CreateMaterialRequest = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialRequest = z.infer<typeof updateMaterialSchema>;
