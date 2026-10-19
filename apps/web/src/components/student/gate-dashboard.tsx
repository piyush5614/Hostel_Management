import { FormEvent, useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, CheckCircle2, Clock3, QrCode, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuthStore } from '../../store/auth-store';
import { initializeSocket } from '../../lib/socket-client';
import { GateMovement, GateStudent, gateService } from '../../services/gate';

const categories = ['college', 'shop/market', 'meet friends', 'medical', 'other'];

function istDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(movement: GateMovement | null): string {
  if (!movement || ['RETURNED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(movement.status)) return 'IN';
  if (movement.status === 'OUT') return 'OUT';
  return 'IN';
}

export function GateDashboard() {
  const getToken = useAuthStore((state) => state.getToken);
  const [token, setToken] = useState('');
  const [student, setStudent] = useState<GateStudent | null>(null);
  const [movement, setMovement] = useState<GateMovement | null>(null);
  const [history, setHistory] = useState<GateMovement[]>([]);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('other');
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [qrResult, pendingResult, historyResult] = await Promise.all([
      gateService.myQr(),
      gateService.pendingForMe(),
      gateService.movements({ page: 1, limit: 20 }),
    ]);
    setToken(qrResult.token);
    setStudent(qrResult.student);
    setMovement(pendingResult.movement || historyResult.data[0] || null);
    setHistory(historyResult.data);
    setError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const initialLoad = async () => {
      try {
        await refresh();
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Could not load gate details.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void initialLoad();

    const accessToken = getToken();
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const onMovement = (event: { movement?: GateMovement }) => {
      if (event.movement) setMovement(event.movement);
      void refresh().catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh gate details.');
      });
    };
    if (accessToken) {
      socket = initializeSocket(accessToken);
      socket.on('gate:reason-requested', onMovement);
      socket.on('gate:movement-updated', onMovement);
    }

    const interval = window.setInterval(() => {
      void refresh().catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh gate details.');
      });
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      socket?.off('gate:reason-requested', onMovement);
      socket?.off('gate:movement-updated', onMovement);
    };
  }, [getToken, refresh]);

  useEffect(() => {
    if (movement?.status !== 'PENDING_REASON') return;
    const deadline = new Date(movement.scanned_at).getTime() + 5 * 60 * 1000;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [movement?.id, movement?.scanned_at, movement?.status]);

  const submitReason = async (event: FormEvent) => {
    event.preventDefault();
    if (!movement || reason.trim().length < 3 || reason.trim().length > 300) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await gateService.submitReason(movement.id, reason.trim(), category);
      setMovement(result.movement);
      setReason('');
      await refresh();
    } catch (submitError) {
      const submissionMessage = submitError instanceof Error ? submitError.message : 'Could not submit your reason.';
      setError(submissionMessage);
      try {
        await refresh();
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : 'Unknown refresh error.';
        setError(`${submissionMessage} Gate status refresh also failed: ${refreshMessage}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="py-8 text-center text-muted-foreground">Loading your gate details…</p>;
  if (error && !student) {
    return <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>;
  }
  if (!student) return <p className="rounded-xl border p-4">Your student profile is not available. Contact your hostel administrator.</p>;

  const isOut = statusLabel(movement) === 'OUT';
  const isCompulsoryModal = movement?.status === 'PENDING_REASON';

  return (
    <section className="space-y-6" aria-label="Gate movement">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Gate movement</h2>
          <p className="text-sm text-muted-foreground">Your QR and movement history</p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${isOut ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
          {isOut ? 'OUT' : 'IN'}
        </span>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />My Gate QR</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-white p-4 shadow-inner">
            {token ? <QRCodeSVG value={token} size={224} level="H" marginSize={2} /> : <RefreshCw className="h-8 w-8 animate-spin" />}
          </div>
          <p className="text-lg font-semibold">{student.name}</p>
          <p className="text-sm text-muted-foreground">
            {student.block ? `Block ${student.block} · ` : ''}Room {student.roomNumber || 'Not assigned'}
          </p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">Do not share this QR.</p>
        </CardContent>
      </Card>

      {movement?.status === 'PENDING_APPROVAL' && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-900" role="status">
          <div className="flex items-center gap-2 font-semibold"><Clock3 className="h-5 w-5" />Waiting for approval</div>
          <p className="mt-1 text-sm">Reason: {movement.reason}</p>
        </div>
      )}
      {movement?.status === 'REJECTED' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900" role="status">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5" />Request rejected</div>
          <p className="mt-1 text-sm">{movement.rejection_note || 'The request was rejected.'}</p>
        </div>
      )}
      {movement?.status === 'EXPIRED' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900" role="status">
          <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5" />Request expired</div>
          <p className="mt-1 text-sm">The reason was not submitted within five minutes.</p>
        </div>
      )}
      {movement?.status === 'OUT' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900" role="status">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />Approved — you are OUT</div>
          <p className="mt-1 text-sm">Out time: {istDateTime(movement.out_time)}</p>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>My movement history</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No gate movements recorded yet.</p> : (
            <div className="space-y-3">
              {history.map((item) => (
                <article key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{item.status.replaceAll('_', ' ')}</span>
                    <span className="text-sm text-muted-foreground">{istDateTime(item.out_time || item.scanned_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">Out: {istDateTime(item.out_time)} · In: {istDateTime(item.in_time)}</p>
                  {item.reason && <p className="mt-1 text-sm">Reason: {item.reason}</p>}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isCompulsoryModal && movement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="gate-reason-title">
          <form onSubmit={submitReason} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-6 shadow-2xl">
            <div>
              <h2 id="gate-reason-title" className="text-xl font-bold">Reason required to leave</h2>
              <p className="mt-1 text-sm text-muted-foreground">Scanned by {movement.scanned_by_name || movement.scanned_by_role} · request expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p>
            </div>
            {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            <label className="block space-y-1 text-sm font-medium">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border bg-background p-3">
                {categories.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium">
              Reason (3–300 characters)
              <textarea required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="w-full rounded-lg border bg-background p-3" autoFocus />
            </label>
            <Button type="submit" isLoading={submitting} disabled={submitting || secondsLeft === 0 || reason.trim().length < 3} className="w-full">
              Submit reason
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
