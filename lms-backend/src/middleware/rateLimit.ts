import { Context, Next } from 'hono';
import { rateLimitResponse } from '../utils/response';
import { Env } from '../types';

export async function rateLimitByIP(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:ip:${ip}`;
  
  try {
    const current = await c.env.KV_SESSIONS.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= 60) { // 60 requests per minute
      return rateLimitResponse(c, 'Rate limit exceeded. Maximum 60 requests per minute.');
    }
    
    await c.env.KV_SESSIONS.put(key, (count + 1).toString(), { expirationTtl: 60 });
    await next();
  } catch (error) {
    // If KV fails, continue without rate limiting
    await next();
  }
}

export async function rateLimitByAPIKey(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  
  if (!apiKey) {
    await next();
    return;
  }
  
  if (apiKey !== c.env.API_KEY) {
    await next();
    return;
  }
  
  const key = `rate_limit:api:${apiKey}`;
  
  try {
    const current = await c.env.KV_SESSIONS.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= 1000) { // 1000 requests per day
      return rateLimitResponse(c, 'API key rate limit exceeded. Maximum 1000 requests per day.');
    }
    
    await c.env.KV_SESSIONS.put(key, (count + 1).toString(), { expirationTtl: 86400 }); // 24 hours
    await next();
  } catch (error) {
    // If KV fails, continue without rate limiting
    await next();
  }
}
