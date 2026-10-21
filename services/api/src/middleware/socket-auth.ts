/**
 * Socket Authentication Middleware
 * Verifies JWT and attaches user context to socket connections
 */

import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import type { TokenPayload } from '../utils/auth.js';

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
    const decoded = verifySocketToken(token);

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      collegeId: decoded.collegeId,
      role: decoded.role,
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
export function verifySocketToken(token: string | null | undefined): TokenPayload {
  if (!token) throw new Error('No token provided');
  const payload = verifyToken(token);
  if (!payload) throw new Error('Invalid token');
  return payload;
}
