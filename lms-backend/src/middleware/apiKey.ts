import { Context, Next } from 'hono';
import { unauthorizedResponse } from '../utils/response';
import { Env } from '../types';

export async function validateAPIKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    await next();
    return;
  }
  
  if (apiKey !== c.env.API_KEY) {
    return unauthorizedResponse(c, 'Invalid API key');
  }
  
  await next();
}
