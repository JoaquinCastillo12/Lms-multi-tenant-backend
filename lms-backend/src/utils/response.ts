import { Context } from 'hono';

export function successResponse(c: Context, data: any, status: number = 200) {
  return c.json({ success: true, data }, status as any);
}

export function errorResponse(c: Context, message: string, status: number = 400) {
  return c.json({ success: false, error: message }, status as any);
}

export function unauthorizedResponse(c: Context, message: string = 'Unauthorized') {
  return c.json({ success: false, error: message }, 401 as any);
}

export function forbiddenResponse(c: Context, message: string = 'Forbidden') {
  return c.json({ success: false, error: message }, 403 as any);
}

export function notFoundResponse(c: Context, message: string = 'Not Found') {
  return c.json({ success: false, error: message }, 404 as any);
}

export function rateLimitResponse(c: Context, message: string = 'Too Many Requests') {
  return c.json({ success: false, error: message }, 429 as any);
}
