import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { courses, users } from '../../drizzle/schema';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response';
import { Env, CreateCourseRequest, UpdateCourseRequest, UserJWTPayload } from '../types';
import { nanoid } from 'nanoid';

export async function getCourses(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const db = drizzle(c.env.DB);

    // Get courses filtered by academy_id
    const allCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.academy_id, user.academyId))
      .all();

    return successResponse(c, allCourses);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch courses');
  }
}

export async function getCourse(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('id');
    const db = drizzle(c.env.DB);

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

    return successResponse(c, course);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch course');
  }
}

export async function createCourse(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const body = await c.req.json() as CreateCourseRequest;
    const { title, instructor_user_id } = body;
    const db = drizzle(c.env.DB);

    // Verify instructor exists and belongs to the same academy
    const instructor = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, instructor_user_id),
        eq(users.academy_id, user.academyId)
      ))
      .get();

    if (!instructor) {
      return errorResponse(c, 'Instructor not found or does not belong to your academy');
    }

    // Only teachers and admins can create courses
    if (user.role === 'student') {
      return forbiddenResponse(c, 'Students cannot create courses');
    }

    // If user is teacher, they can only create courses for themselves
    if (user.role === 'teacher' && instructor_user_id !== user.userId) {
      return forbiddenResponse(c, 'Teachers can only create courses for themselves');
    }

    const courseId = nanoid();
    const newCourse = {
      id: courseId,
      title,
      academy_id: user.academyId,
      instructor_user_id,
    };

    await db.insert(courses).values(newCourse).run();

    return successResponse(c, newCourse, 201);
  } catch (error) {
    return errorResponse(c, 'Failed to create course');
  }
}

export async function updateCourse(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('id');
    const body = await c.req.json() as UpdateCourseRequest;
    const db = drizzle(c.env.DB);

    // Get existing course
    const existingCourse = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!existingCourse) {
      return notFoundResponse(c, 'Course not found');
    }

    // Check permissions
    if (user.role === 'student') {
      return forbiddenResponse(c, 'Students cannot update courses');
    }

    if (user.role === 'teacher' && existingCourse.instructor_user_id !== user.userId) {
      return forbiddenResponse(c, 'Teachers can only update their own courses');
    }

    // If updating instructor, verify they exist and belong to the academy
    if (body.instructor_user_id) {
      const instructor = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, body.instructor_user_id),
          eq(users.academy_id, user.academyId)
        ))
        .get();

      if (!instructor) {
        return errorResponse(c, 'Instructor not found or does not belong to your academy');
      }
    }

    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.instructor_user_id) updateData.instructor_user_id = body.instructor_user_id;

    await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, courseId))
      .run();

    const updatedCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .get();

    return successResponse(c, updatedCourse);
  } catch (error) {
    return errorResponse(c, 'Failed to update course');
  }
}

export async function deleteCourse(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const courseId = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Get existing course
    const existingCourse = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.academy_id, user.academyId)
      ))
      .get();

    if (!existingCourse) {
      return notFoundResponse(c, 'Course not found');
    }

    // Only admins can delete courses
    if (user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can delete courses');
    }

    await db
      .delete(courses)
      .where(eq(courses.id, courseId))
      .run();

    return successResponse(c, { message: 'Course deleted successfully' });
  } catch (error) {
    return errorResponse(c, 'Failed to delete course');
  }
}
