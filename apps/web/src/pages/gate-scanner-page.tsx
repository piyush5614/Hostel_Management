import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle2, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../store/auth-store';
import { initializeSocket } from '../lib/socket-client';
import { GateMovement, GateStudent, gateService } from '../services/gate';

const SCANNER_ID = 'gate-movement-qr-scanner';

function istTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function GateScannerPage() {
  const user = useAuthStore((state) => state.user);
  const getToken = useAuthStore((state) => state.getToken);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [entry, setEntry] = useState('');
  const [student, setStudent] = useState<GateStudent | null>(null);
  const [movement, setMovement] = useState<GateMovement | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const hasMovement = Boolean(movement);
  const movementId = movement?.id;
  const movementStudentId = movement?.student_id;
  const movementStatus = movement?.status;

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraReady(false);
    if (!scanner) return;
    try {
      if (scanner.getState() === 2) await scanner.stop();
    } catch (stopError) {
      console.warn('Could not stop gate scanner camera:', stopError);
    }
  }, []);

  const processEntry = useCallback(async (value: string) => {
    const input = value.trim();
    if (!input || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = input.startsWith('TCHC1.')
        ? await gateService.scan({ token: input })
        : await gateService.scan({ enrollmentNo: input });
      setStudent(result.student);
      setMovement(result.movement);
      setEntry('');
      if (result.returned) setNotice('Student returning — return recorded automatically. The student is now IN.');
      else if (!result.created && result.movement.status.startsWith('PENDING')) setNotice('This student already has an active request. Showing the existing request.');
      else if (result.movement.status === 'PENDING_REASON') setNotice('Waiting for the student to submit a reason.');
      else setNotice(`Movement status: ${result.movement.status}.`);
      await stopCamera();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Could not process the scan.');
    } finally {
      setBusy(false);
    }
  }, [busy, stopCamera]);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const element = document.getElementById(SCANNER_ID);
        if (!element || !mounted) return;
        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => { void processEntry(decodedText); },
          () => undefined
        );
        if (mounted) {
          setCameraReady(true);
          setCameraError(null);
        }
      } catch (cameraStartError) {
        if (!mounted) return;
        const message = cameraStartError instanceof Error ? cameraStartError.message : String(cameraStartError);
        setCameraError(/notallowed|permission|denied/i.test(message)
          ? 'Camera permission denied. Allow camera access in your browser or Android app settings, or use manual entry below.'
          : 'Camera could not start. Check camera access and HTTPS/localhost, or use manual entry below.');
      }
    };
    if (!hasMovement) void startCamera();
    return () => {
      mounted = false;
      void stopCamera();
    };
  }, [hasMovement, processEntry, stopCamera]);

  useEffect(() => {
    if (!movementId || !movementStudentId || !movementStatus ||
        !['PENDING_REASON', 'PENDING_APPROVAL'].includes(movementStatus)) return;
    let mounted = true;
    const refreshMovement = async () => {
      try {
        const page = await gateService.movements({ studentId: movementStudentId, limit: 1 });
        const latest = page.data.find((item) => item.id === movementId);
        if (latest && mounted) setMovement(latest);
      } catch (refreshError) {
        if (mounted) setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh this request.');
      }
    };
    const accessToken = getToken();
    const socket = accessToken ? initializeSocket(accessToken) : null;
    const handleReason = (event: { movement?: GateMovement }) => {
      if (event.movement?.id === movementId) setMovement(event.movement);
    };
    socket?.on('gate:reason-submitted', handleReason);
    const interval = window.setInterval(() => void refreshMovement(), 5000);
    void refreshMovement();
    return () => {
      mounted = false;
      window.clearInterval(interval);
      socket?.off('gate:reason-submitted', handleReason);
    };
  }, [getToken, movementId, movementStatus, movementStudentId]);

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    await processEntry(entry);
  };

  const act = async (action: 'approve' | 'reject' | 'cancel') => {
    if (!movement) return;
    setBusy(true);
    setError(null);
    try {
      const result = await gateService.transition(movement.id, action, rejectNote);
      setMovement(result.movement);
      setRejectNote('');
      setNotice(action === 'approve' ? 'Approved. Student is now OUT.' : action === 'reject' ? 'Request rejected.' : 'Request cancelled.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update the request.');
    } finally {
      setBusy(false);
    }
  };

  const regenerateQr = async () => {
    if (!student) return;
    setBusy(true);
    setError(null);
    try {
      await gateService.regenerateQr(student.id);
      setNotice('Student QR regenerated. The previous QR is now revoked.');
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : 'Could not regenerate the student QR.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Gate scanner</h2>
        <p className="text-sm text-muted-foreground">Verify the student in front of you before recording a movement.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}

      {!movement && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Scan student QR</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div id={SCANNER_ID} className="min-h-64 overflow-hidden rounded-xl bg-black" />
            {cameraReady && <p className="text-center text-xs text-muted-foreground">Camera active</p>}
            {cameraError && <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />{cameraError}</p>}
            <form onSubmit={submitManual} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
                placeholder="Paste QR token or enter enrollment number"
                aria-label="Manual QR token or enrollment number"
                className="min-w-0 flex-1 rounded-lg border bg-background p-3"
              />
              <Button type="submit" isLoading={busy} disabled={!entry.trim() || busy}>Look up student</Button>
            </form>
            <p className="text-xs text-muted-foreground">Camera access requires HTTPS or localhost. Manual lookup is available if camera permission is denied.</p>
          </CardContent>
        </Card>
      )}

      {student && movement && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Verify student</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              {student.profileImage ? (
                <img src={student.profileImage} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><UserRound className="h-9 w-9" /></div>
              )}
              <div className="min-w-0">
                <h3 className="text-xl font-bold">{student.name}</h3>
                <p className="text-sm font-medium">{student.enrollmentNo || 'Enrollment unavailable'}</p>
                <p className="text-sm text-muted-foreground">
                  {student.block ? `Block ${student.block} · ` : ''}Room {student.roomNumber || 'Unassigned'} · {student.course || 'Course unavailable'} {student.year || ''}
                </p>
                <p className="text-sm text-muted-foreground">{student.mobileNumber || 'Mobile unavailable'}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-semibold">Status: {movement.status.replaceAll('_', ' ')}</p>
              {movement.reason && <p className="mt-1 text-sm">Reason: {movement.reason} {movement.reason_category ? `(${movement.reason_category})` : ''}</p>}
              {movement.out_time && <p className="mt-1 text-sm">Out time: {istTime(movement.out_time)}</p>}
              {movement.status === 'PENDING_REASON' && <p className="mt-1 text-sm">Waiting for the student to submit a reason…</p>}
              {movement.status === 'OUT' && <p className="mt-1 text-sm font-medium text-amber-800">Student is currently OUT. Scan again when they return to record arrival.</p>}
            </div>

            {movement.status === 'PENDING_APPROVAL' && (
              <div className="space-y-3">
                <label className="block space-y-1 text-sm font-medium">
                  Rejection note (required to reject)
                  <textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} maxLength={300} rows={2} className="w-full rounded-lg border bg-background p-3" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void act('approve')} isLoading={busy} disabled={busy} variant="success">Approve departure</Button>
                  <Button onClick={() => void act('reject')} isLoading={busy} disabled={busy || rejectNote.trim().length < 3} variant="destructive">Reject request</Button>
                  <Button onClick={() => void act('cancel')} disabled={busy} variant="outline">Cancel request</Button>
                </div>
              </div>
            )}

            {movement.status === 'PENDING_REASON' && (
              <Button onClick={() => void act('cancel')} disabled={busy} variant="outline">Cancel request</Button>
            )}
            {movement.status === 'OUT' && (
              <p className="flex items-center gap-2 font-medium text-amber-800"><CheckCircle2 className="h-5 w-5" />Departure approved — student is OUT.</p>
            )}
            {movement.status === 'RETURNED' && (
              <p className="flex items-center gap-2 font-medium text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />Student returned at {istTime(movement.in_time)}
                {movement.out_time && movement.in_time
                  ? ` · Out for ${Math.floor((new Date(movement.in_time).getTime() - new Date(movement.out_time).getTime()) / 3600000)}h ${Math.floor(((new Date(movement.in_time).getTime() - new Date(movement.out_time).getTime()) % 3600000) / 60000)}m`
                  : ''}.
              </p>
            )}

            {user?.role === 'admin' && (
              <Button onClick={() => void regenerateQr()} disabled={busy} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />Regenerate student QR
              </Button>
            )}
            <Button variant="outline" onClick={() => { setMovement(null); setStudent(null); setNotice(null); setError(null); }}>Scan another student</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
