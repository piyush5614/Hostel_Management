import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('FATAL: JWT_SECRET must be set to a strong value (32+ chars) in production.');
}

if (!configuredSecret || configuredSecret.length < 32) {
  console.warn('WARNING: JWT_SECRET is unset or weak; using a randomly generated development secret.');
}

const JWT_SECRET = configuredSecret || randomBytes(32).toString('hex');

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  collegeId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
