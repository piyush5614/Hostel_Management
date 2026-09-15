import { afterEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
  vi.resetModules();
});

describe('JWT secret configuration', () => {
  it('throws during production boot when JWT_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    await expect(import('../utils/auth.js')).rejects.toThrow(
      'FATAL: JWT_SECRET must be set to a strong value (32+ chars) in production.'
    );
  });

  it('uses a valid production secret for signing and verification', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);

    const { generateToken, verifyToken } = await import('../utils/auth.js');
    const payload = { userId: 'user-1', email: 'user@example.com', role: 'student', collegeId: 'college-1' };
    const token = generateToken(payload);

    expect(verifyToken(token)).toMatchObject(payload);
  });
});