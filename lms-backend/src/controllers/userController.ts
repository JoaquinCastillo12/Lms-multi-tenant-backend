import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { users, courses } from '../../drizzle/schema';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response';
import { Env, UserJWTPayload, UserRole } from '../types';
import { nanoid } from 'nanoid';
import { hashPassword } from '../utils/hash';

export async function getUsers(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const db = drizzle(c.env.DB);

    // Only admins can view all users
    if (user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can view all users');
    }

    // Get users filtered by academy_id
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        academy_id: users.academy_id
      })
      .from(users)
      .where(eq(users.academy_id, user.academyId))
      .all();

    return successResponse(c, allUsers);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch users');
  }
}

export async function getUser(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const userId = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Users can view their own profile, admins can view any user in their academy
    if (user.role !== 'admin' && user.userId !== userId) {
      return forbiddenResponse(c, 'You can only view your own profile');
    }

    const targetUser = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        academy_id: users.academy_id
      })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.academy_id, user.academyId)
      ))
      .get();

    if (!targetUser) {
      return notFoundResponse(c, 'User not found');
    }

    return successResponse(c, targetUser);
  } catch (error) {
    return errorResponse(c, 'Failed to fetch user');
  }
}

export async function createUser(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      email: string;
      password: string;
      role: UserRole;
    };
    const { email, password, role } = body;
    const db = drizzle(c.env.DB);

    // Only admins can create users
    if (user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can create users');
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      return errorResponse(c, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    const userId = nanoid();
    const newUser = {
      id: userId,
      email,
      password_hash: passwordHash,
      role,
      academy_id: user.academyId,
    };

    await db.insert(users).values(newUser).run();

    // Return user without password hash
    const { password_hash, ...userResponse } = newUser;
    return successResponse(c, userResponse, 201);
  } catch (error) {
    return errorResponse(c, 'Failed to create user');
  }
}

export async function updateUser(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const userId = c.req.param('id');
    const body = await c.req.json() as {
      email?: string;
      password?: string;
      role?: UserRole;
    };
    const db = drizzle(c.env.DB);

    // Get existing user
    const existingUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.academy_id, user.academyId)
      ))
      .get();

    if (!existingUser) {
      return notFoundResponse(c, 'User not found');
    }

    // Check permissions
    if (user.role !== 'admin' && user.userId !== userId) {
      return forbiddenResponse(c, 'You can only update your own profile');
    }

    // Students can only update their own email and password, not role
    if (user.role === 'student' && userId !== user.userId) {
      return forbiddenResponse(c, 'Students can only update their own profile');
    }

    // Teachers can only update their own profile, not role
    if (user.role === 'teacher' && userId !== user.userId && body.role) {
      return forbiddenResponse(c, 'Teachers cannot change user roles');
    }

    // Only admins can change roles
    if (body.role && user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can change user roles');
    }

    // Check if email is already taken by another user
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .get();

      if (emailExists) {
        return errorResponse(c, 'Email already taken by another user');
      }
    }

    const updateData: any = {};
    if (body.email) updateData.email = body.email;
    if (body.password) updateData.password_hash = await hashPassword(body.password);
    if (body.role && user.role === 'admin') updateData.role = body.role;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .run();

    const updatedUser = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        academy_id: users.academy_id
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    return successResponse(c, updatedUser);
  } catch (error) {
    return errorResponse(c, 'Failed to update user');
  }
}

export async function deleteUser(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>) {
  try {
    const user = c.get('user');
    const userId = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Get existing user
    const existingUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.academy_id, user.academyId)
      ))
      .get();

    if (!existingUser) {
      return notFoundResponse(c, 'User not found');
    }

    // Only admins can delete users
    if (user.role !== 'admin') {
      return forbiddenResponse(c, 'Only admins can delete users');
    }

    // Check if user is an instructor of any courses
    const coursesByInstructor = await db
      .select()
      .from(courses)
      .where(eq(courses.instructor_user_id, userId))
      .all();

    if (coursesByInstructor.length > 0) {
      return errorResponse(c, 'Cannot delete user who is an instructor of existing courses');
    }

    await db
      .delete(users)
      .where(eq(users.id, userId))
      .run();

    return successResponse(c, { message: 'User deleted successfully' });
  } catch (error) {
    return errorResponse(c, 'Failed to delete user');
  }
}
