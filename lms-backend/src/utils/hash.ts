// src/controllers/userController.ts
import bcrypt from 'bcryptjs';
import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import { users } from '../../drizzle/schema';
import { Env } from '../types';
import { successResponse, errorResponse } from './response';

// Function to securely verify a password
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Endpoint to create a new user Only for the first user (admin)
export async function createUser(c: Context<{ Bindings: Env }>) {
  try {
    // Extract fields from the request body
    const { email, password, role, academyId } = await c.req.json();

    // Validate required fields
    if (!email || !password || !role || !academyId) {
      return errorResponse(c, 'Missing required fields', 400);
    }

    const db = drizzle(c.env.DB);

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = nanoid();

    // Insert the user into the database
    await db.insert(users).values({
      id: userId,
      email,
      password_hash: passwordHash,
      role,
      academy_id: academyId,
    }).run();

    // Return success response with the created user's info
    return successResponse(c, {
      message: 'User created successfully',
      user: { id: userId, email, role, academyId },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return errorResponse(c, 'Failed to create user', 500);
  }
}
