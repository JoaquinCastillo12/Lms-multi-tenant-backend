import { Context, Next } from 'hono';
import { forbiddenResponse } from '../utils/response';
import { UserRole, UserJWTPayload } from '../types';

export function authorize(roles: UserRole[]) {
  return async (c: Context<{ Variables: { user: UserJWTPayload } }>, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return forbiddenResponse(c, 'User not authenticated');
    }

    if (!roles.includes(user.role)) {
      return forbiddenResponse(c, 'Insufficient permissions');
    }

    await next();
  };
}
