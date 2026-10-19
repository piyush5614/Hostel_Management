import { randomBytes } from 'node:crypto';
import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { TokenPayload } from '../utils/auth.js';
import { MovementExportRow, writeMovementWorkbook } from '../utils/gate-export.js';
import {
  deriveIstDate,
  isValidGateCategory,
  isValidGateDateRange,
  isValidGateToken,
  normalizeGateReason,
  parseIstDate,
} from '../utils/gate-movement.js';

const SCANNER_ROLES = ['staff', 'warden', 'admin'] as const;

type ScannerRole = typeof SCANNER_ROLES[number];

interface StudentRecord {
  id: string;
  user_id: string;
  enrollment_number: string | null;
  course: string | null;
  year: number | null;
  contact_number: string | null;
  profile_image: string | null;
  room_id: string | null;
  user?: { name?: string; profile_image?: string | null } | null;
  room?: { number?: string; block?: string | null } | null;
}

function collegeIdFor(user: TokenPayload): string {
  return user.collegeId;
}

function newQrToken(): string {
  return `TCHC1.${randomBytes(32).toString('base64url')}`;
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: message, code });
}

function hasScannerRole(role: string): role is ScannerRole {
  return (SCANNER_ROLES as readonly string[]).includes(role);
}

function toStudentSnapshot(
  student: StudentRecord,
  user: { name?: string; profile_image?: string | null } | null,
  room: { number?: string; block?: string | null } | null
) {
  return {
    id: student.id,
    userId: student.user_id,
    name: user?.name || '',
    profileImage: student.profile_image || user?.profile_image || null,
    enrollmentNo: student.enrollment_number,
    roomNumber: room?.number || null,
    block: room?.block || null,
    course: student.course,
    year: student.year,
    mobileNumber: student.contact_number,
  };
}

async function getStudentSnapshot(
  db: Awaited<ReturnType<typeof getDb>>,
  collegeId: string,
  query: { studentId?: string; userId?: string; enrollmentNo?: string }
) {
  let studentQuery = db
    .from('students')
    .select('id, user_id, enrollment_number, course, year, contact_number, profile_image, room_id')
    .eq('college_id', collegeId);

  if (query.studentId) studentQuery = studentQuery.eq('id', query.studentId);
  if (query.userId) studentQuery = studentQuery.eq('user_id', query.userId);
  if (query.enrollmentNo) studentQuery = studentQuery.eq('enrollment_number', query.enrollmentNo);

  const { data: student, error } = await studentQuery.maybeSingle();
  if (error) throw error;
  if (!student) return null;

  const [userResult, roomResult] = await Promise.all([
    db.from('users').select('name, profile_image').eq('id', student.user_id).eq('college_id', collegeId).maybeSingle(),
    student.room_id
      ? db.from('rooms').select('number, block').eq('id', student.room_id).eq('college_id', collegeId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (userResult.error) throw userResult.error;
  if (roomResult.error) throw roomResult.error;

  return toStudentSnapshot(student as StudentRecord, userResult.data, roomResult.data);
}

function emitCollege(io: SocketIOServer, collegeId: string, event: string, data: Record<string, unknown>): void {
  io.to(`college:${collegeId}`).emit(event, data);
}

function emitUser(io: SocketIOServer, userId: string, event: string, data: Record<string, unknown>): void {
  io.to(`user:${userId}`).emit(event, data);
}

async function expirePending(db: Awaited<ReturnType<typeof getDb>>, collegeId: string): Promise<void> {
  const { error } = await db.rpc('gate_expire_pending_reason', { p_college_id: collegeId });
  if (error) throw error;
}

function movementRpcError(res: Response, error: string): void {
  const errors: Record<string, { status: number; message: string }> = {
    FORBIDDEN: { status: 403, message: 'This action is not allowed for your role.' },
    NOT_FOUND: { status: 404, message: 'Movement request not found.' },
    NOT_YOUR_PROFILE: { status: 403, message: 'You can only request a movement for your own student profile.' },
    NOT_YOUR_REQUEST: { status: 403, message: 'You are not allowed to act on this request.' },
    ACTIVE_MOVEMENT: { status: 409, message: 'You already have an active gate request or outing. Complete or cancel it before requesting another.' },
    NO_PENDING_REQUEST: { status: 409, message: 'No departure request is pending. Ask the student to start one from their dashboard before scanning.' },
    REQUEST_EXPIRED: { status: 410, message: 'This request has expired.' },
    INVALID_TRANSITION: { status: 409, message: 'This movement is no longer in a state that allows this action.' },
    INVALID_ACTION: { status: 400, message: 'Invalid movement action.' },
  };
  const result = errors[error] || { status: 500, message: 'Could not update movement.' };
  fail(res, result.status, error, result.message);
}

export function createGateRoutes(io: SocketIOServer): Router {
  const router = Router();
  const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many scan attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
  });
  const reasonLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many reason submissions. Please wait and try again.', code: 'RATE_LIMITED' },
  });

  router.get('/my-qr', authenticate, authorize('student'), async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const collegeId = collegeIdFor(req.user!);
      const student = await getStudentSnapshot(db, collegeId, { userId: req.user!.userId });
      if (!student) {
        fail(res, 404, 'STUDENT_NOT_FOUND', 'Student profile not found.');
        return;
      }

      const initialQr = await db
        .from('student_qr_tokens')
        .select('token, qr_version')
        .eq('college_id', collegeId)
        .eq('student_id', student.id)
        .eq('is_active', true)
        .maybeSingle();
      if (initialQr.error) throw initialQr.error;
      let qr = initialQr.data;

      if (!qr) {
        const { data: latestQr, error: latestQrError } = await db
          .from('student_qr_tokens')
          .select('qr_version')
          .eq('college_id', collegeId)
          .eq('student_id', student.id)
          .order('qr_version', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestQrError) throw latestQrError;
        const { data: inserted, error: insertError } = await db
          .from('student_qr_tokens')
          .insert({
            college_id: collegeId,
            student_id: student.id,
            token: newQrToken(),
            qr_version: (latestQr?.qr_version || 0) + 1,
            is_active: true,
          })
          .select('token, qr_version')
          .single();
        if (insertError?.code === '23505') {
          const reread = await db
            .from('student_qr_tokens')
            .select('token, qr_version')
            .eq('college_id', collegeId)
            .eq('student_id', student.id)
            .eq('is_active', true)
            .single();
          if (reread.error) throw reread.error;
          qr = reread.data;
        } else if (insertError) {
          throw insertError;
        } else {
          qr = inserted;
        }
      }

      res.json({ token: qr.token, qrVersion: qr.qr_version, student });
    } catch (error) {
      console.error('Get own gate QR failed:', error);
      fail(res, 500, 'GATE_QR_UNAVAILABLE', 'Could not load your gate QR.');
    }
  });

  router.post(
    '/movements/request',
    authenticate,
    authorize('student'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        const student = await getStudentSnapshot(db, collegeId, { userId: req.user!.userId });
        if (!student) {
          fail(res, 404, 'STUDENT_NOT_FOUND', 'Student profile not found.');
          return;
        }

        const { data, error } = await db.rpc('gate_request_movement', {
          p_college_id: collegeId,
          p_student_id: student.id,
          p_student_user_id: req.user!.userId,
          p_student_name: student.name,
          p_enrollment_no: student.enrollmentNo,
          p_room_number: student.roomNumber,
          p_hostel_block: student.block,
          p_mobile_number: student.mobileNumber,
          p_course_year: [student.course, student.year].filter(Boolean).join(' / '),
        });
        if (error) throw error;
        if (data?.error) {
          movementRpcError(res, data.error);
          return;
        }

        res.status(201).json({ movement: data.movement });
      } catch (error) {
        console.error('Start student gate movement request failed:', error);
        fail(res, 500, 'GATE_REQUEST_FAILED', 'Could not start a new gate movement request.');
      }
    }
  );

  router.post(
    '/qr/:studentId/regenerate',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        const { data, error } = await db.rpc('gate_regenerate_student_qr', {
          p_college_id: collegeId,
          p_student_id: req.params.studentId,
          p_actor_id: req.user!.userId,
          p_actor_role: req.user!.role,
          p_token: newQrToken(),
        });
        if (error) throw error;
        if (data?.error) {
          movementRpcError(res, data.error);
          return;
        }
        res.json({ token: data.token.token, qrVersion: data.token.qr_version });
      } catch (error) {
        console.error('Regenerate student gate QR failed:', error);
        fail(res, 500, 'GATE_QR_REGENERATION_FAILED', 'Could not regenerate this student QR.');
      }
    }
  );

  router.post(
    '/scan',
    authenticate,
    authorize(...SCANNER_ROLES),
    scanLimiter,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
        const enrollmentNo = typeof req.body?.enrollmentNo === 'string' ? req.body.enrollmentNo.trim() : '';
        if ((token && enrollmentNo) || (!token && !enrollmentNo)) {
          fail(res, 400, 'INVALID_SCAN_INPUT', 'Provide either a QR token or an enrollment number.');
          return;
        }
        if (token && !isValidGateToken(token)) {
          fail(res, 400, 'INVALID_TOKEN_FORMAT', 'This QR token is not valid.');
          return;
        }
        if (enrollmentNo && (enrollmentNo.length > 80 || !/^[A-Za-z0-9._/-]+$/.test(enrollmentNo))) {
          fail(res, 400, 'INVALID_ENROLLMENT_NUMBER', 'Enter a valid enrollment number.');
          return;
        }

        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        let student: ReturnType<typeof toStudentSnapshot> | null;
        if (token) {
          const { data: qr, error } = await db
            .from('student_qr_tokens')
            .select('student_id')
            .eq('college_id', collegeId)
            .eq('token', token)
            .eq('is_active', true)
            .maybeSingle();
          if (error) throw error;
          if (!qr) {
            fail(res, 404, 'UNKNOWN_OR_REVOKED_TOKEN', 'This QR is unknown or has been revoked.');
            return;
          }
          student = await getStudentSnapshot(db, collegeId, { studentId: qr.student_id });
        } else {
          student = await getStudentSnapshot(db, collegeId, { enrollmentNo });
        }
        if (!student) {
          fail(res, 404, 'STUDENT_NOT_FOUND', 'No student was found for this scan.');
          return;
        }

        const { data: result, error } = await db.rpc('gate_scan_movement', {
          p_college_id: collegeId,
          p_student_id: student.id,
          p_student_user_id: student.userId,
          p_scanned_by: req.user!.userId,
          p_scanned_by_role: req.user!.role,
          p_student_name: student.name,
          p_enrollment_no: student.enrollmentNo,
          p_room_number: student.roomNumber,
          p_hostel_block: student.block,
          p_mobile_number: student.mobileNumber,
          p_course_year: [student.course, student.year].filter(Boolean).join(' / '),
          p_manual_entry: Boolean(enrollmentNo),
        });
        if (error) throw error;
        if (result?.error) {
          movementRpcError(res, result.error);
          return;
        }

        const movement = result.movement;
        const { data: scanner, error: scannerError } = await db
          .from('users')
          .select('name')
          .eq('id', req.user!.userId)
          .eq('college_id', collegeId)
          .maybeSingle();
        if (scannerError) throw scannerError;
        const movementWithScanner = { ...movement, scanned_by_name: scanner?.name || 'Hostel staff' };
        const response = { movement: movementWithScanner, student };
        if (result.created) {
          emitUser(io, student.userId, 'gate:reason-requested', { movement: movementWithScanner });
        }
        if (result.returned) {
          emitUser(io, student.userId, 'gate:movement-updated', { movement: movementWithScanner });
          emitCollege(io, collegeId, 'gate:currently-out-updated', { movementId: movement.id, status: 'RETURNED' });
        }
        res.json({ ...response, created: result.created, returned: result.returned });
      } catch (error) {
        console.error('Gate scan failed:', error);
        fail(res, 500, 'GATE_SCAN_FAILED', 'Could not process this scan.');
      }
    }
  );

  router.post(
    '/movements/:id/reason',
    authenticate,
    authorize('student'),
    reasonLimiter,
    async (req: Request, res: Response): Promise<void> => {
      const reason = normalizeGateReason(req.body?.reason);
      const categoryValue = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
      const category = categoryValue || null;
      if (!reason) {
        fail(res, 400, 'INVALID_REASON', 'Reason must be between 3 and 300 characters.');
        return;
      }
      if (!isValidGateCategory(category)) {
        fail(res, 400, 'INVALID_REASON_CATEGORY', 'Choose a valid reason category.');
        return;
      }

      try {
        const db = await getDb();
        const { data, error } = await db.rpc('gate_transition_movement', {
          p_college_id: collegeIdFor(req.user!),
          p_movement_id: req.params.id,
          p_actor_id: req.user!.userId,
          p_actor_role: req.user!.role,
          p_action: 'reason',
          p_reason: reason,
          p_category: category,
          p_note: null,
        });
        if (error) throw error;
        if (data?.error) {
          movementRpcError(res, data.error);
          return;
        }
        const movement = data.movement;
        emitUser(io, movement.scanned_by, 'gate:reason-submitted', { movement });
        res.json({ movement });
      } catch (error) {
        console.error('Submit gate movement reason failed:', error);
        fail(res, 500, 'GATE_REASON_FAILED', 'Could not submit the movement reason.');
      }
    }
  );

  const transition = (action: 'approve' | 'reject' | 'cancel') => async (
    req: Request,
    res: Response
  ): Promise<void> => {
    if (action === 'reject') {
      const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
      if (note.length < 3 || note.length > 300) {
        fail(res, 400, 'INVALID_REJECTION_NOTE', 'Rejection note must be between 3 and 300 characters.');
        return;
      }
    }

    try {
      const db = await getDb();
      const { data, error } = await db.rpc('gate_transition_movement', {
        p_college_id: collegeIdFor(req.user!),
        p_movement_id: req.params.id,
        p_actor_id: req.user!.userId,
        p_actor_role: req.user!.role,
        p_action: action,
        p_reason: null,
        p_category: null,
        p_note: action === 'reject' ? req.body.note.trim() : null,
      });
      if (error) throw error;
      if (data?.error) {
        movementRpcError(res, data.error);
        return;
      }
      const movement = data.movement;
      const student = await getStudentSnapshot(db, collegeIdFor(req.user!), { studentId: movement.student_id });
      if (!student) {
        fail(res, 404, 'STUDENT_NOT_FOUND', 'Student profile not found.');
        return;
      }
      emitUser(io, student.userId, 'gate:movement-updated', { movement });
      if (action === 'approve') {
        emitCollege(io, collegeIdFor(req.user!), 'gate:currently-out-updated', { movementId: movement.id, status: 'OUT' });
      }
      res.json({ movement });
    } catch (error) {
      console.error(`Gate movement ${action} failed:`, error);
      fail(res, 500, 'GATE_MOVEMENT_UPDATE_FAILED', 'Could not update this movement.');
    }
  };

  router.post('/movements/:id/approve', authenticate, authorize(...SCANNER_ROLES), transition('approve'));
  router.post('/movements/:id/reject', authenticate, authorize(...SCANNER_ROLES), transition('reject'));
  router.post('/movements/:id/cancel', authenticate, authorize(...SCANNER_ROLES), transition('cancel'));

  router.get(
    '/movements/pending-for-me',
    authenticate,
    authorize('student'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        const student = await getStudentSnapshot(db, collegeId, { userId: req.user!.userId });
        if (!student) {
          fail(res, 404, 'STUDENT_NOT_FOUND', 'Student profile not found.');
          return;
        }
        await expirePending(db, collegeId);
        const { data, error } = await db
          .from('gate_movements')
          .select('*')
          .eq('college_id', collegeId)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          res.json({ movement: null });
          return;
        }
        const { data: scanner, error: scannerError } = await db
          .from('users')
          .select('name')
          .eq('id', data.scanned_by)
          .eq('college_id', collegeId)
          .maybeSingle();
        if (scannerError) throw scannerError;
        res.json({ movement: { ...data, scanned_by_name: scanner?.name || 'Hostel staff' } });
      } catch (error) {
        console.error('Get student gate movement failed:', error);
        fail(res, 500, 'GATE_MOVEMENT_UNAVAILABLE', 'Could not load your gate movement.');
      }
    }
  );

  router.get(
    '/movements/export',
    authenticate,
    authorize(...SCANNER_ROLES),
    async (req: Request, res: Response): Promise<void> => {
      const defaultDate = deriveIstDate(new Date());
      const from = parseIstDate(req.query.from === undefined ? defaultDate : req.query.from);
      const to = parseIstDate(req.query.to === undefined ? defaultDate : req.query.to);
      if (from === undefined || to === undefined || !from || !to || !isValidGateDateRange(from, to)) {
        fail(res, 400, 'INVALID_DATE_RANGE', 'Provide a valid date range no longer than 366 days.');
        return;
      }

      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const allowedStatuses = new Set(['PENDING_REASON', 'PENDING_APPROVAL', 'OUT', 'RETURNED', 'EXPIRED', 'REJECTED', 'CANCELLED']);
      if (status && !allowedStatuses.has(status)) {
        fail(res, 400, 'INVALID_STATUS', 'Choose a valid movement status.');
        return;
      }
      const block = typeof req.query.block === 'string' ? req.query.block.trim() : '';
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      if (search && (search.length > 80 || !/^[A-Za-z0-9 ._/-]+$/.test(search))) {
        fail(res, 400, 'INVALID_SEARCH', 'Search contains unsupported characters.');
        return;
      }

      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        await expirePending(db, collegeId);
        const movements: MovementExportRow[] = [];
        let offset = 0;
        const batchSize = 1000;
        while (true) {
          let query = db
            .from('gate_movements')
            .select('*')
            .eq('college_id', collegeId)
            .gte('out_date_ist', from)
            .lte('out_date_ist', to)
            .order('out_date_ist', { ascending: true })
            .order('out_time', { ascending: true });
          if (status) query = query.eq('status', status);
          if (block) query = query.eq('hostel_block', block);
          if (studentId) query = query.eq('student_id', studentId);
          if (search) query = query.or(`student_name.ilike.%${search}%,enrollment_no.ilike.%${search}%`);
          const { data, error } = await query.range(offset, offset + batchSize - 1);
          if (error) throw error;
          const batch = (data || []) as MovementExportRow[];
          movements.push(...batch);
          if (batch.length < batchSize) break;
          offset += batchSize;
        }

        if (movements.length === 0) {
          fail(res, 404, 'NO_MOVEMENTS', 'No gate movements were found for the selected range and filters.');
          return;
        }

        const actorIds = [...new Set(movements.flatMap((movement) => [movement.approved_by, movement.return_scanned_by]).filter((id): id is string => Boolean(id)))];
        const userNames = new Map<string, string>();
        for (let index = 0; index < actorIds.length; index += 500) {
          const { data: users, error } = await db
            .from('users')
            .select('id, name')
            .eq('college_id', collegeId)
            .in('id', actorIds.slice(index, index + 500));
          if (error) throw error;
          for (const actor of users || []) userNames.set(actor.id, actor.name);
        }

        const filename = `Hostel_Movement_Report_${from}_to_${to}.xlsx`;
        res.status(200);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await writeMovementWorkbook(res, movements, userNames, from, to);
      } catch (error) {
        console.error('Export gate movement workbook failed:', error);
        if (res.headersSent) {
          res.destroy(error instanceof Error ? error : new Error('Excel export failed'));
          return;
        }
        fail(res, 500, 'GATE_EXPORT_FAILED', 'Could not generate the movement report.');
      }
    }
  );

  router.get(
    '/currently-out',
    authenticate,
    authorize(...SCANNER_ROLES),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        await expirePending(db, collegeId);
        let query = db
          .from('gate_movements')
          .select('*')
          .eq('college_id', collegeId)
          .eq('status', 'OUT')
          .order('out_time', { ascending: true });
        if (typeof req.query.block === 'string' && req.query.block.trim()) {
          query = query.eq('hostel_block', req.query.block.trim());
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json({ data: data || [] });
      } catch (error) {
        console.error('Get currently out students failed:', error);
        fail(res, 500, 'CURRENTLY_OUT_UNAVAILABLE', 'Could not load students currently out.');
      }
    }
  );

  router.get(
    '/movements',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      if (!hasScannerRole(req.user!.role) && req.user!.role !== 'student') {
        fail(res, 403, 'FORBIDDEN', 'This action is not allowed for your role.');
        return;
      }
      const from = parseIstDate(req.query.from);
      const to = parseIstDate(req.query.to);
      if (from === undefined || to === undefined || !isValidGateDateRange(from || null, to || null)) {
        fail(res, 400, 'INVALID_DATE_RANGE', 'Use valid dates with a range no longer than 366 days.');
        return;
      }
      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '25'), 10) || 25));

      try {
        const db = await getDb();
        const collegeId = collegeIdFor(req.user!);
        await expirePending(db, collegeId);
        let query = db
          .from('gate_movements')
          .select('*', { count: 'exact' })
          .eq('college_id', collegeId)
          .order('created_at', { ascending: false });

        if (req.user!.role === 'student') {
          const student = await getStudentSnapshot(db, collegeId, { userId: req.user!.userId });
          if (!student) {
            res.json({ data: [], page, limit, total: 0, totalPages: 0 });
            return;
          }
          query = query.eq('student_id', student.id);
        } else if (typeof req.query.studentId === 'string' && req.query.studentId.trim()) {
          query = query.eq('student_id', req.query.studentId.trim());
        }
        if (from) query = query.gte('out_date_ist', from);
        if (to) query = query.lte('out_date_ist', to);
        if (typeof req.query.status === 'string' && req.query.status.trim()) {
          const allowedStatuses = new Set(['PENDING_REASON', 'PENDING_APPROVAL', 'OUT', 'RETURNED', 'EXPIRED', 'REJECTED', 'CANCELLED']);
          if (!allowedStatuses.has(req.query.status)) {
            fail(res, 400, 'INVALID_STATUS', 'Choose a valid movement status.');
            return;
          }
          query = query.eq('status', req.query.status);
        }
        if (typeof req.query.block === 'string' && req.query.block.trim() && req.user!.role !== 'student') {
          query = query.eq('hostel_block', req.query.block.trim());
        }
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        if (search && req.user!.role !== 'student') {
          if (search.length > 80 || !/^[A-Za-z0-9 ._/-]+$/.test(search)) {
            fail(res, 400, 'INVALID_SEARCH', 'Search contains unsupported characters.');
            return;
          }
          query = query.or(`student_name.ilike.%${search}%,enrollment_no.ilike.%${search}%`);
        }
        const start = (page - 1) * limit;
        const { data, error, count } = await query.range(start, start + limit - 1);
        if (error) throw error;
        res.json({
          data: data || [],
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        });
      } catch (error) {
        console.error('Get gate movement history failed:', error);
        fail(res, 500, 'GATE_HISTORY_UNAVAILABLE', 'Could not load movement history.');
      }
    }
  );

  return router;
}

export default createGateRoutes;
