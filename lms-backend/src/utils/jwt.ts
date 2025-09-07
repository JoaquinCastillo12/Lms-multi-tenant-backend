import { SignJWT, jwtVerify } from 'jose';
import { UserJWTPayload } from '../types';

export async function createAccessToken(payload: Omit<UserJWTPayload, 'iat' | 'exp'>, jwtSecret: string): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function createRefreshToken(userId: string, jwtSecret: string): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyAccessToken(token: string, jwtSecret: string): Promise<UserJWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as UserJWTPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyRefreshToken(token: string, jwtSecret: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string };
  } catch (error) {
    return null;
  }
}
