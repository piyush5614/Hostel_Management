/**
 * Socket Authentication Middleware
 * Verifies JWT and attaches user context to socket connections
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Type definition for authenticated requests
export interface AuthenticatedRequest {
  user?: {
    id: string;
    email: string;
    collegeId: string;
    role: string;
  };
  [key: string]: any; // Allow any other properties
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function socketAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const secret = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      collegeId: decoded.college_id,
      role: decoded.user_role,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Extract token from handshake for socket.io
 */
export function extractSocketToken(handshake: any): string | null {
  return handshake.auth.token || handshake.headers.authorization?.replace('Bearer ', '') || null;
}

/**
 * Verify JWT and return decoded payload
 */
export function verifySocketToken(token: string): any {
  try {
    const secret = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
}
