import { describe, expect, it } from 'vitest';
import { generateToken } from '../../utils/auth.js';
import { verifySocketToken } from '../../middleware/socket-auth.js';

describe('Socket.IO token verification', () => {
  it('accepts application-issued JWTs and exposes the application claims', () => {
    const payload = {
      userId: 'student-1',
      email: 'student@example.invalid',
      role: 'student',
      collegeId: 'college-1',
    };

    expect(verifySocketToken(generateToken(payload))).toMatchObject(payload);
  });

  it('rejects missing tokens', () => {
    expect(() => verifySocketToken(null)).toThrow('No token provided');
  });

  it('rejects malformed or invalid JWTs', () => {
    expect(() => verifySocketToken('not-a-jwt')).toThrow('Invalid token');
  });
});
