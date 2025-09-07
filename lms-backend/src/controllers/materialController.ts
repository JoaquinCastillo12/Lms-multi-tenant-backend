import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { materials, lessons, courses } from '../../drizzle/schema';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response';
import { Env, UserJWTPayload } from '../types';
import { nanoid } from 'nanoid';

// Get all materials or materials for a specific lesson
export async function getMaterials(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const lessonId = c.req.query('lesson_id');
    const db = drizzle(c.env.DB);

    if (lessonId) {
      // Verify lesson exists and belongs to user's academy
      const lesson = await db
        .select()
        .from(lessons)
        .innerJoin(courses, eq(lessons.course_id, courses.id))
        .where(and(eq(lessons.id, lessonId), eq(courses.academy_id, user.academyId)))
        .get();

      if (!lesson) return notFoundResponse(c, 'Lesson not found');

      // Get all materials for the specific lesson
      const allMaterials = await db
        .select()
        .from(materials)
        .where(eq(materials.lesson_id, lessonId))
        .all();

      return successResponse(c, allMaterials);
    }

    // Get all materials across the user's academy
    const allMaterials = await db
      .select()
      .from(materials)
      .innerJoin(lessons, eq(materials.lesson_id, lessons.id))
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(eq(courses.academy_id, user.academyId))
      .all();

    return successResponse(c, allMaterials);
  } catch (error) {
    console.error(error);
    return errorResponse(c, 'Failed to fetch materials');
  }
}

// Get a single material by ID
export async function getMaterial(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const materialId = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Fetch material with joins to verify academy ownership
    const material = await db
      .select({
        id: materials.id,
        filename: materials.filename,
        url_r2: materials.url_r2,
        lesson_id: materials.lesson_id
      })
      .from(materials)
      .innerJoin(lessons, eq(materials.lesson_id, lessons.id))
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(and(eq(materials.id, materialId), eq(courses.academy_id, user.academyId)))
      .get();

    if (!material) return notFoundResponse(c, 'Material not found');

    return successResponse(c, material);
  } catch (error) {
    console.error(error);
    return errorResponse(c, 'Failed to fetch material');
  }
}

// Create a new material
export async function createMaterial(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');

    const body = await c.req.json(); // Parse JSON body
    const { lesson_id, filename, url_r2 } = body;

    if (!lesson_id || !filename || !url_r2) 
      return errorResponse(c, 'Missing lesson_id, filename or url_r2');

    const db = drizzle(c.env.DB);

    // Verify the lesson exists and belongs to the user's academy
    const lesson = await db
      .select()
      .from(lessons)
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(and(eq(lessons.id, lesson_id), eq(courses.academy_id, user.academyId)))
      .get();

    if (!lesson) return notFoundResponse(c, 'Lesson not found');

    // Permission checks
    if (user.role === 'student') return forbiddenResponse(c, 'Students cannot create materials');
    if (user.role === 'teacher' && lesson.lessons.author_user_id !== user.userId)
      return forbiddenResponse(c, 'Teachers can only add materials to their own lessons');

    // Insert new material metadata into the database
    const newMaterial = {
      id: nanoid(),
      filename,
      url_r2,
      lesson_id
    };
    await db.insert(materials).values(newMaterial).run();

    return successResponse(c, newMaterial, 201);
  } catch (error) {
    console.error(error);
    return errorResponse(c, 'Failed to create material');
  }
}

// Update an existing material
export async function updateMaterial(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const materialId = c.req.param('id');
    const body = await c.req.json() as { filename?: string; url_r2?: string };
    const db = drizzle(c.env.DB);

    // Fetch the material with joins to verify academy ownership and author
    const existingMaterial = await db
      .select({
        id: materials.id,
        filename: materials.filename,
        url_r2: materials.url_r2,
        lesson_id: materials.lesson_id,
        author_user_id: lessons.author_user_id
      })
      .from(materials)
      .innerJoin(lessons, eq(materials.lesson_id, lessons.id))
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(and(eq(materials.id, materialId), eq(courses.academy_id, user.academyId)))
      .get();

    if (!existingMaterial) return notFoundResponse(c, 'Material not found');

    // Permission checks
    if (user.role === 'student') return forbiddenResponse(c, 'Students cannot update materials');
    if (user.role === 'teacher' && existingMaterial.author_user_id !== user.userId)
      return forbiddenResponse(c, 'Teachers can only update materials from their own lessons');

    // Build update object dynamically
    const updateData: any = {};
    if (body.filename) updateData.filename = body.filename;
    if (body.url_r2) updateData.url_r2 = body.url_r2;

    // Update material in DB
    await db.update(materials).set(updateData).where(eq(materials.id, materialId)).run();

    const updatedMaterial = await db.select().from(materials).where(eq(materials.id, materialId)).get();
    return successResponse(c, updatedMaterial);
  } catch (error) {
    console.error(error);
    return errorResponse(c, 'Failed to update material');
  }
}

// Delete a material
export async function deleteMaterial(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const materialId = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Fetch material with joins to verify academy ownership and author
    const existingMaterial = await db
      .select({
        id: materials.id,
        filename: materials.filename,
        url_r2: materials.url_r2,
        lesson_id: materials.lesson_id,
        author_user_id: lessons.author_user_id
      })
      .from(materials)
      .innerJoin(lessons, eq(materials.lesson_id, lessons.id))
      .innerJoin(courses, eq(lessons.course_id, courses.id))
      .where(and(eq(materials.id, materialId), eq(courses.academy_id, user.academyId)))
      .get();

    if (!existingMaterial) return notFoundResponse(c, 'Material not found');

    // Permission checks
    if (user.role === 'student') return forbiddenResponse(c, 'Students cannot delete materials');
    if (user.role === 'teacher' && existingMaterial.author_user_id !== user.userId)
      return forbiddenResponse(c, 'Teachers can only delete materials from their own lessons');

    // Delete the material
    await db.delete(materials).where(eq(materials.id, materialId)).run();
    return successResponse(c, { message: 'Material deleted successfully' });
  } catch (error) {
    console.error(error);
    return errorResponse(c, 'Failed to delete material');
  }
}

