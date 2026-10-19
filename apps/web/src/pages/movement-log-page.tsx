import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { GateMovement, gateService } from '../services/gate';

function todayInIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function istDateTime(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
}

export function MovementLogPage() {
  const [from, setFrom] = useState(todayInIst);
  const [to, setTo] = useState(todayInIst);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [block, setBlock] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<GateMovement[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await gateService.movements({ from, to, status, search, block, page, limit: 25 });
      setRows(result.data);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load movement history.');
    } finally {
      setLoading(false);
    }
  }, [block, from, page, search, status, to]);

  useEffect(() => { void refresh(); }, [refresh]);

  const exportMovements = async () => {
    setExporting(true);
    setError(null);
    try {
      await gateService.exportMovements({ from, to, status, search, block });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export the movement report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Movement log</h2>
          <p className="text-sm text-muted-foreground">Date-wise gate movement records. All displayed times are IST.</p>
        </div>
        <Button variant="outline" onClick={() => void exportMovements()} isLoading={exporting} disabled={exporting || loading}>
          <Download className="mr-2 h-4 w-4" />Export to Excel
        </Button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">From <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="block w-full rounded-lg border bg-background p-2.5" /></label>
          <label className="space-y-1 text-sm">To <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="block w-full rounded-lg border bg-background p-2.5" /></label>
          <label className="space-y-1 text-sm">Status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="block w-full rounded-lg border bg-background p-2.5">
              <option value="">All statuses</option>
              {['PENDING_REASON', 'PENDING_APPROVAL', 'OUT', 'RETURNED', 'EXPIRED', 'REJECTED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Student search
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or enrollment no." className="block w-full rounded-lg border bg-background p-2.5" />
          </label>
          <label className="space-y-1 text-sm">Block
            <input value={block} onChange={(event) => { setBlock(event.target.value); setPage(1); }} placeholder="Block name" className="block w-full rounded-lg border bg-background p-2.5" />
          </label>
          <div className="flex items-end"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Movements</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="py-6 text-center text-muted-foreground">Loading movements…</p> : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No movements found for this date range and filters.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{row.student_name} · {row.status.replaceAll('_', ' ')}</span>
                    <span className="text-sm text-muted-foreground">{row.hostel_block ? `${row.hostel_block} · ` : ''}Room {row.room_number || '—'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.enrollment_no || '—'} · Out {istDateTime(row.out_time)} · In {istDateTime(row.in_time)}</p>
                  {row.reason && <p className="mt-1 text-sm">Reason: {row.reason}</p>}
                </article>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, totalPages)}</span>
            <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
