import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like } from 'drizzle-orm';
import { users } from '../../drizzle/schema';
import { verifyPassword } from '../utils/hash';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response';
import { Env, LoginRequest, RefreshTokenRequest } from '../types';


export async function login(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json() as LoginRequest;
    const { email, password } = body;
    const db = drizzle(c.env.DB);
    
    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      return unauthorizedResponse(c, 'Invalid credentials');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return unauthorizedResponse(c, 'Invalid credentials');
    }

    // Create tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      academyId: user.academy_id,
    }, c.env.JWT_SECRET);

    const refreshToken = await createRefreshToken(user.id, c.env.JWT_SECRET);

    // Store refresh token in KV
    await c.env.KV_SESSIONS.put(`refresh_token:${user.id}`, refreshToken, {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days
    });

    return successResponse(c, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        academyId: user.academy_id,
      },
    });
  } catch (error) {
    return errorResponse(c, 'Login failed');
  }
}

export async function refresh(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json() as RefreshTokenRequest;
    const { refreshToken } = body;

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET);
    if (!payload) {
      return unauthorizedResponse(c, 'Invalid refresh token');
    }

    // Check if refresh token exists in KV
    const storedToken = await c.env.KV_SESSIONS.get(`refresh_token:${payload.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return unauthorizedResponse(c, 'Invalid refresh token');
    }

    const db = drizzle(c.env.DB);
    
    // Get user data
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .get();

    if (!user) {
      return unauthorizedResponse(c, 'User not found');
    }

    // Create new access token
    const newAccessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      academyId: user.academy_id,
    }, c.env.JWT_SECRET);

    return successResponse(c, {
      accessToken: newAccessToken,
    });
  } catch (error) {
    return errorResponse(c, 'Token refresh failed');
  }
}

export async function logout(c: Context<{ Bindings: Env }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(c, 'Missing authorization header');
    }

    const token = authHeader.substring(7);
    const payload = await verifyRefreshToken(token, c.env.JWT_SECRET);
    
    if (payload) {
      // Remove refresh token from KV
      await c.env.KV_SESSIONS.delete(`refresh_token:${payload.userId}`);
    }

    return successResponse(c, { message: 'Logged out successfully' });
  } catch (error) {
    return errorResponse(c, 'Logout failed');
  }
}





