export type GateMovementStatus =
  | 'PENDING_REASON'
  | 'PENDING_APPROVAL'
  | 'OUT'
  | 'RETURNED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED';

export type GateAction = 'reason' | 'approve' | 'reject' | 'cancel';

const TOKEN_PATTERN = /^TCHC1\.[A-Za-z0-9_-]{43}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_CATEGORIES = new Set(['college', 'shop/market', 'meet friends', 'medical', 'other']);
const ALLOWED_TRANSITIONS: Record<GateAction, GateMovementStatus[]> = {
  reason: ['PENDING_REASON'],
  approve: ['PENDING_APPROVAL'],
  reject: ['PENDING_APPROVAL'],
  cancel: ['PENDING_REASON', 'PENDING_APPROVAL'],
};

export function isValidGateToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function normalizeGateReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length >= 3 && normalized.length <= 300 ? normalized : null;
}

export function isValidGateCategory(value: unknown): value is string {
  return value === null || value === undefined || value === '' ||
    (typeof value === 'string' && ALLOWED_CATEGORIES.has(value));
}

export function parseIstDate(value: unknown): string | null | undefined {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function isValidGateDateRange(from: string | null, to: string | null): boolean {
  if (!from || !to) return true;
  const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000;
  return days >= 0 && days <= 365;
}

export function deriveIstDate(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isReasonExpired(scannedAt: string | Date, now = Date.now()): boolean {
  const timestamp = new Date(scannedAt).getTime();
  return Number.isFinite(timestamp) && now >= timestamp + 5 * 60 * 1000;
}

export function canTransitionGateMovement(status: GateMovementStatus, action: GateAction): boolean {
  return ALLOWED_TRANSITIONS[action].includes(status);
}
