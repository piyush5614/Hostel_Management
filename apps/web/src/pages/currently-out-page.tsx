import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { initializeSocket } from '../lib/socket-client';
import { useAuthStore } from '../store/auth-store';
import { GateMovement, gateService } from '../services/gate';

function istTime(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' }).format(new Date(value))
    : '—';
}

function duration(value: string | null): string {
  if (!value) return '00:00';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function CurrentlyOutPage() {
  const getToken = useAuthStore((state) => state.getToken);
  const [rows, setRows] = useState<GateMovement[]>([]);
  const [search, setSearch] = useState('');
  const [block, setBlock] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await gateService.currentlyOut();
    setRows(result.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = () => void refresh().catch((loadError) => {
      if (mounted) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load the currently-out list.');
        setLoading(false);
      }
    });
    load();
    const token = getToken();
    const socket = token ? initializeSocket(token) : null;
    socket?.on('gate:currently-out-updated', load);
    const poll = window.setInterval(load, 5000);
    return () => {
      mounted = false;
      window.clearInterval(poll);
      socket?.off('gate:currently-out-updated', load);
    };
  }, [getToken, refresh]);

  const blocks = useMemo(() => [...new Set(rows.map((row) => row.hostel_block).filter((value): value is string => Boolean(value)))].sort(), [rows]);
  const visibleRows = useMemo(() => rows.filter((row) => {
    const matchesBlock = !block || row.hostel_block === block;
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || [row.student_name, row.enrollment_no, row.room_number, row.mobile_number]
      .some((value) => value?.toLocaleLowerCase().includes(query));
    return matchesBlock && matchesSearch;
  }), [block, rows, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Currently out</h2>
          <p className="text-sm text-muted-foreground">Live list refreshes automatically every five seconds.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, room, mobile or enrollment" className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-3" />
        </label>
        <select value={block} onChange={(event) => setBlock(event.target.value)} aria-label="Filter by block" className="rounded-lg border bg-background px-3 py-2.5">
          <option value="">All blocks</option>
          {blocks.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>{visibleRows.length} currently out</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="py-6 text-center text-muted-foreground">Loading current movements…</p> : visibleRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No students are currently out.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead><tr className="border-b bg-muted/60">
                  {['Student', 'Enrollment', 'Block', 'Room', 'Mobile', 'Reason', 'Out time (IST)', 'Out for'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const durationText = duration(row.out_time);
                    const longOut = Number(durationText.split(':')[0]) >= 4;
                    return (
                      <tr key={row.id} className={`border-b last:border-0 ${longOut ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                        <td className="px-3 py-3 font-semibold">{row.student_name}{longOut && <AlertTriangle className="ml-1 inline h-4 w-4 text-amber-600" />}</td>
                        <td className="px-3 py-3">{row.enrollment_no || '—'}</td>
                        <td className="px-3 py-3">{row.hostel_block || '—'}</td>
                        <td className="px-3 py-3">{row.room_number || '—'}</td>
                        <td className="px-3 py-3">{row.mobile_number || '—'}</td>
                        <td className="max-w-56 whitespace-normal px-3 py-3">{row.reason || '—'}</td>
                        <td className="px-3 py-3">{istTime(row.out_time)}</td>
                        <td className="px-3 py-3 font-mono font-semibold">{durationText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
