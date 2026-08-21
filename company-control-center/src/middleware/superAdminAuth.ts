import type { Request, Response, NextFunction } from 'express';
import type { ControlCenterConfig } from '../config.js';

declare module 'express-serve-static-core' {
  interface Request {
    actorName?: string;
  }
}

export function createSuperAdminAuth(config: ControlCenterConfig) {
  return function superAdminAuth(req: Request, res: Response, next: NextFunction): void {
    const key = req.header('x-platform-key');
    const actor = req.header('x-platform-actor') || 'platform-owner';

    if (!key || !config.superAdminKeys.includes(key)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid x-platform-key',
      });
      return;
    }

    req.actorName = actor;
    next();
  };
}
