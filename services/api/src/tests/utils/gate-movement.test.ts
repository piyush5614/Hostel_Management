import { describe, expect, it } from 'vitest';
import {
  canTransitionGateMovement,
  deriveIstDate,
  isReasonExpired,
  isValidGateCategory,
  isValidGateDateRange,
  isValidGateToken,
  normalizeGateReason,
  parseIstDate,
} from '../../utils/gate-movement.js';

describe('gate movement validation', () => {
  it('accepts only correctly shaped opaque QR tokens', () => {
    expect(isValidGateToken(`TCHC1.${'A'.repeat(43)}`)).toBe(true);
    expect(isValidGateToken(`TCHC1.${'a_-'.repeat(14)}a`)).toBe(true);
    expect(isValidGateToken(`TCHC1.${'A'.repeat(42)}`)).toBe(false);
    expect(isValidGateToken(`TCHC1.${'A'.repeat(44)}`)).toBe(false);
    expect(isValidGateToken(`TCHC1.${'A'.repeat(42)}!`)).toBe(false);
    expect(isValidGateToken(`TCHC1.${'A'.repeat(43)}-personal-data`)).toBe(false);
  });

  it('trims and enforces the 3-to-300 character reason boundary', () => {
    expect(normalizeGateReason('  class  ')).toBe('class');
    expect(normalizeGateReason('ab')).toBeNull();
    expect(normalizeGateReason('x'.repeat(300))).toBe('x'.repeat(300));
    expect(normalizeGateReason('x'.repeat(301))).toBeNull();
    expect(normalizeGateReason(null)).toBeNull();
  });

  it('accepts only configured categories or no category', () => {
    expect(isValidGateCategory('medical')).toBe(true);
    expect(isValidGateCategory(null)).toBe(true);
    expect(isValidGateCategory('unknown')).toBe(false);
  });

  it('accepts valid dates and limits ranges to at most 366 inclusive dates', () => {
    expect(parseIstDate('2026-10-19')).toBe('2026-10-19');
    expect(parseIstDate('2026-02-30')).toBeUndefined();
    expect(parseIstDate('10/19/2026')).toBeUndefined();
    expect(isValidGateDateRange('2026-01-01', '2027-01-01')).toBe(true);
    expect(isValidGateDateRange('2026-01-01', '2027-01-02')).toBe(false);
    expect(isValidGateDateRange('2026-01-02', '2026-01-01')).toBe(false);
  });
});

describe('gate movement state machine', () => {
  const legalTransitions = [
    ['PENDING_REASON', 'reason'],
    ['PENDING_REASON', 'cancel'],
    ['PENDING_APPROVAL', 'approve'],
    ['PENDING_APPROVAL', 'reject'],
    ['PENDING_APPROVAL', 'cancel'],
  ] as const;

  it.each(legalTransitions)('allows %s -> %s', (status, action) => {
    expect(canTransitionGateMovement(status, action)).toBe(true);
  });

  const terminalStatuses = ['OUT', 'RETURNED', 'EXPIRED', 'REJECTED', 'CANCELLED'] as const;
  it.each(terminalStatuses)('rejects all actions from terminal state %s', (status) => {
    expect(canTransitionGateMovement(status, 'reason')).toBe(false);
    expect(canTransitionGateMovement(status, 'approve')).toBe(false);
    expect(canTransitionGateMovement(status, 'reject')).toBe(false);
    expect(canTransitionGateMovement(status, 'cancel')).toBe(false);
  });

  it('does not allow approval or rejection before the reason is submitted', () => {
    expect(canTransitionGateMovement('PENDING_REASON', 'approve')).toBe(false);
    expect(canTransitionGateMovement('PENDING_REASON', 'reject')).toBe(false);
    expect(canTransitionGateMovement('PENDING_APPROVAL', 'reason')).toBe(false);
  });
});

describe('gate movement time handling', () => {
  it('expires reason requests at exactly five minutes', () => {
    const scannedAt = '2026-10-19T12:00:00.000Z';
    expect(isReasonExpired(scannedAt, Date.parse(scannedAt) + 299_999)).toBe(false);
    expect(isReasonExpired(scannedAt, Date.parse(scannedAt) + 300_000)).toBe(true);
  });

  it('derives the Asia/Kolkata calendar date from UTC timestamps', () => {
    expect(deriveIstDate('2026-10-19T18:40:00.000Z')).toBe('2026-10-20');
    expect(deriveIstDate('2026-10-19T18:29:00.000Z')).toBe('2026-10-19');
  });
});
