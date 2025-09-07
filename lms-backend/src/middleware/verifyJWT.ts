import { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorizedResponse } from '../utils/response';
import { Env, UserJWTPayload } from '../types';

export async function verifyJWT(c: Context<{ Bindings: Env; Variables: { user: UserJWTPayload } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse(c, 'Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return unauthorizedResponse(c, 'Invalid or expired token');
  }

  c.set('user', payload);
  await next();
}
