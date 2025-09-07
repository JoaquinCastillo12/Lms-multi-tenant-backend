import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { lessons, courses } from '../../drizzle/schema';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response';
import { Env, CreateLessonRequest, UpdateLessonRequest, UserJWTPayload } from '../types';
import { nanoid } from 'nanoid';

export async function getLessons(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('courseId');
    const db = drizzle(c.env.DB);

    // Verify course exists and belongs to user's academy
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!course) {
      return notFoundResponse(c, 'Course not found');
    }

    // Get lessons for the course
    const allLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.course_id, courseId))
      .all();

    return successResponse(c, allLessons);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch lessons');
  }
}

export async function getLesson(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('courseId');
    const lessonId = c.req.param('lessonId');
    const db = drizzle(c.env.DB);

    // Verify course exists and belongs to user's academy
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!course) {
      return notFoundResponse(c, 'Course not found');
    }

    const lesson = await db
      .select()
      .from(lessons)
      .where(and(
        eq(lessons.id, lessonId),
        eq(lessons.course_id, courseId)
      ))
      .get();

    if (!lesson) {
      return notFoundResponse(c, 'Lesson not found');
    }

    return successResponse(c, lesson);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch lesson');
  }
}

export async function createLesson(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('courseId');
    const body = await c.req.json() as CreateLessonRequest;
    const { title, status } = body;
    const db = drizzle(c.env.DB);

    // Verify course exists and belongs to user's academy
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!course) {
      return notFoundResponse(c, 'Course not found');
    }

    // Only teachers and admins can create lessons
    if (user.role === 'student') {
      return forbiddenResponse(c, 'Students cannot create lessons');
    }

    // If user is teacher, they can only create lessons for courses they instruct
    if (user.role === 'teacher' && course.instructor_user_id !== user.userId) {
      return forbiddenResponse(c, 'Teachers can only create lessons for their own courses');
    }

    const lessonId = nanoid();
    const newLesson = {
      id: lessonId,
      title,
      status,
      course_id: courseId,
      author_user_id: user.userId,
    };

    await db.insert(lessons).values(newLesson).run();

    return successResponse(c, newLesson, 201);
  } catch (error) {
    return errorResponse(c, 'Failed to create lesson');
  }
}

export async function updateLesson(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('courseId');
    const lessonId = c.req.param('lessonId');
    const body = await c.req.json() as UpdateLessonRequest;
    const db = drizzle(c.env.DB);

    // Verify course exists and belongs to user's academy
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!course) {
      return notFoundResponse(c, 'Course not found');
    }

    // Get existing lesson
    const existingLesson = await db
      .select()
      .from(lessons)
      .where(and(
        eq(lessons.id, lessonId),
        eq(lessons.course_id, courseId)
      ))
      .get();

    if (!existingLesson) {
      return notFoundResponse(c, 'Lesson not found');
    }

    // Check permissions
    if (user.role === 'student') {
      return forbiddenResponse(c, 'Students cannot update lessons');
    }

    if (user.role === 'teacher' && existingLesson.author_user_id !== user.userId) {
      return forbiddenResponse(c, 'Teachers can only update their own lessons');
    }

    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.status) updateData.status = body.status;

    await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, lessonId))
      .run();

    const updatedLesson = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .get();

    return successResponse(c, updatedLesson);
  } catch (error) {
    return errorResponse(c, 'Failed to update lesson');
  }
}

export async function deleteLesson(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('courseId');
    const lessonId = c.req.param('lessonId');
    const db = drizzle(c.env.DB);

    // Verify course exists and belongs to user's academy
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!course) {
      return notFoundResponse(c, 'Course not found');
    }

    // Get existing lesson
    const existingLesson = await db
      .select()
      .from(lessons)
      .where(and(
        eq(lessons.id, lessonId),
        eq(lessons.course_id, courseId)
      ))
      .get();

    if (!existingLesson) {
      return notFoundResponse(c, 'Lesson not found');
    }

    // Only admins can delete lessons
    if (user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can delete lessons');
    }

    await db
      .delete(lessons)
      .where(eq(lessons.id, lessonId))
      .run();

    return successResponse(c, { message: 'Lesson deleted successfully' });
  } catch (error) {
    return errorResponse(c, 'Failed to delete lesson');
  }
}
