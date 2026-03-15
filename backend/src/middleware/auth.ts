import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantId?: string;
    }
  }
}

export function getRequestCollegeId(req: Request): string {
  const headerCollegeId = typeof req.headers['x-college-id'] === 'string'
    ? req.headers['x-college-id']
    : undefined;
  const queryCollegeId = typeof req.query.collegeId === 'string'
    ? req.query.collegeId
    : undefined;
  const bodyCollegeId = typeof req.body?.collegeId === 'string'
    ? req.body.collegeId
    : undefined;

  return resolveCollegeId(req.user?.collegeId || headerCollegeId || queryCollegeId || bodyCollegeId);
}

export function attachTenantContext(req: Request, _res: Response, next: NextFunction): void {
  req.tenantId = getRequestCollegeId(req);
  next();
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
