import { useState, useCallback, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';
import { useAuthStore } from '../store/auth-store';
import { recordParentCall, mockStudents, mockLeaveRequests, syncLeaveRequestsFromApi } from '../store/mock-data';
import {
  Camera, Phone, CheckCircle, User, AlertTriangle,
  ScanLine, Clock, History, ArrowRight, ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useDataRefresh } from '../utils/use-data-refresh';
import { EVENTS } from '../utils/event-bus';

interface ScanRecord {
  id: string;
  studentName: string;
  parentName: string;
  phone: string;
  leaveRequestId: string;
  timestamp: string;
  callConfirmed: boolean;
}

interface QRScanResult {
  type: string;
  phone: string;
  leaveRequestId: string;
  studentName: string;
  parentName: string;
}

type ScanStep = 'scanning' | 'scanned' | 'calling' | 'confirming';

export function QRScannerPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  useDataRefresh([EVENTS.LEAVE_UPDATED]);

  const [step, setStep] = useState<ScanStep>('scanning');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [callConfirmed, setCallConfirmed] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-scanner-page-container';

  const isAdmin = user?.role === 'admin';
  const isWarden = user?.role === 'warden';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const element = document.getElementById(scannerContainerId);
    if (!element) return;

    try {
      await stopScanner();
      const html5Qrcode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText) as QRScanResult;
            if (data.type === 'leave-parent-call' && data.phone) {
              setScanResult(data);
              setStep('scanned');
              setError(null);
              html5Qrcode.stop().catch(() => {});
            } else {
              setError('Invalid QR code. Please scan a leave request QR code.');
            }
          } catch {
            setError('Invalid QR code format.');
          }
        },
        () => {}
      );
    } catch (err: any) {
      if (err?.toString?.().includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setError('Could not start camera. Ensure a camera is available.');
      }
    }
  }, [stopScanner]);

  useEffect(() => {
    if (step === 'scanning') {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [step, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!user?.id || (!isAdmin && !isWarden)) {
      return;
    }
    void syncLeaveRequestsFromApi();
  }, [user?.id, isAdmin, isWarden]);

  const handleCallNow = () => {
    if (!scanResult) return;
    window.location.href = `tel:${scanResult.phone}`;
    setStep('confirming');
  };

  const handleConfirmCall = () => {
    if (!scanResult || !callConfirmed) return;

    const result = recordParentCall(
      scanResult.leaveRequestId,
      user?.id || 'unknown',
      callNotes
    );

    if (result) {
      toast.success(`Parent call verified for ${scanResult.studentName}'s leave request`);
      setScanHistory((prev) => [
        {
          id: Date.now().toString(),
          studentName: scanResult.studentName,
          parentName: scanResult.parentName,
          phone: scanResult.phone,
          leaveRequestId: scanResult.leaveRequestId,
          timestamp: new Date().toISOString(),
          callConfirmed: true,
        },
        ...prev,
      ]);
    } else {
      toast.error('Leave request not found. It may have already been processed.');
    }

    // Reset for next scan
    setScanResult(null);
    setCallConfirmed(false);
    setCallNotes('');
    setError(null);
    setStep('scanning');
  };

  const handleRescan = () => {
    setScanResult(null);
    setCallConfirmed(false);
    setCallNotes('');
    setError(null);
    setStep('scanning');
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setError(null);
      const html5Qrcode = new Html5Qrcode('qr-file-scanner-page-temp');
      const decodedText = await html5Qrcode.scanFile(file, false);
      html5Qrcode.clear();

      const data = JSON.parse(decodedText) as QRScanResult;
      if (data.type === 'leave-parent-call' && data.phone) {
        await stopScanner();
        setScanResult(data);
        setStep('scanned');
        setError(null);
      } else {
        setError('Invalid QR code. Please upload a leave request QR code image.');
      }
    } catch {
      setError('Could not read QR code from this image. Please try a clearer image.');
    }
  }, [stopScanner]);

  // Redirect if not admin/warden
  if (!isAdmin && !isWarden) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              Only Admin and Warden accounts can access the QR Scanner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ScanLine className="h-8 w-8 text-indigo-600" />
              QR Scanner
            </h1>
            <p className="text-muted-foreground mt-1">
              Scan student leave QR codes to verify parent calls before approval
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/leave')}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Go to Leave Management
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Scanner Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {step === 'scanning' && 'Scan QR Code'}
                  {step === 'scanned' && 'QR Code Scanned'}
                  {step === 'confirming' && 'Confirm Parent Call'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {/* Scanning */}
                {step === 'scanning' && (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden bg-black relative mx-auto max-w-lg" style={{ minHeight: 320 }}>
                      <div id={scannerContainerId} className="w-full" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      <Camera className="inline h-4 w-4 mr-1 -mt-0.5" />
                      Point camera at the student's leave request QR code
                    </p>
                    <div className="relative flex items-center justify-center max-w-lg mx-auto">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                      <span className="relative bg-white dark:bg-gray-900 px-3 text-xs text-muted-foreground">or</span>
                    </div>
                    <div className="hidden" id="qr-file-scanner-page-temp" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-lg mx-auto flex"
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Upload QR Image from Gallery
                    </Button>
                  </div>
                )}

                {/* Scanned */}
                {step === 'scanned' && scanResult && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium text-sm">
                        <CheckCircle className="h-4 w-4" />
                        QR Code Scanned Successfully
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Student:</span>
                        </div>
                        <span className="font-medium">{scanResult.studentName}</span>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Parent:</span>
                        </div>
                        <span className="font-medium">{scanResult.parentName}</span>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Phone:</span>
                        </div>
                        <span className="font-medium">{scanResult.phone}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleRescan} className="flex-1">
                        <Camera className="mr-2 h-4 w-4" />
                        Re-scan
                      </Button>
                      <Button
                        onClick={handleCallNow}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call Parent Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confirming */}
                {step === 'confirming' && scanResult && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">
                        <Phone className="inline h-4 w-4 mr-1 -mt-0.5" />
                        Call placed to {scanResult.parentName} ({scanResult.phone})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Student: {scanResult.studentName}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={callConfirmed}
                          onChange={(e) => setCallConfirmed(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">
                          I confirm I spoke with the parent (<strong>{scanResult.parentName}</strong>) and 
                          the parent has given verbal permission for this leave.
                        </span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium mb-1">Call Notes (optional)</label>
                        <textarea
                          value={callNotes}
                          onChange={(e) => setCallNotes(e.target.value)}
                          placeholder="Any notes from the conversation..."
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleCallNow} className="flex-1">
                        <Phone className="mr-2 h-4 w-4" />
                        Call Again
                      </Button>
                      <Button
                        onClick={handleConfirmCall}
                        disabled={!callConfirmed}
                        className={cn(
                          'flex-1',
                          callConfirmed
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                            : ''
                        )}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm & Verify
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scan History / Info Sidebar */}
          <div className="space-y-4">
            {/* Instructions Card */}
            <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-700 dark:text-indigo-300">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600">1</span>
                  <p className="text-xs text-muted-foreground">Student submits a leave request — a QR code is generated automatically</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600">2</span>
                  <p className="text-xs text-muted-foreground">Scan the QR code with this scanner to get the parent's phone number</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600">3</span>
                  <p className="text-xs text-muted-foreground">Call the parent and get verbal permission for the leave</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600">4</span>
                  <p className="text-xs text-muted-foreground">Confirm the call, then approve the leave in Leave Management</p>
                </div>
              </CardContent>
            </Card>

            {/* Scan History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Scan History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <ScanLine className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-xs">No scans yet this session</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scanHistory.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{record.studentName}</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          Parent: {record.parentName} • {record.phone}
                        </p>
                        <p className="text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Leaves Quick View */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Leaves (Unverified)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const pendingUnverified = mockLeaveRequests.filter(
                    (r) => r.status === 'pending' && !r.parentCallVerified
                  );
                  if (pendingUnverified.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        All pending leaves are verified!
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {pendingUnverified.slice(0, 5).map((req) => {
                        const student = mockStudents.find((s) => s.id === req.studentId);
                        return (
                          <div key={req.id} className="rounded-lg border p-2.5 text-xs">
                            <div className="font-medium">{student?.name || 'Unknown'}</div>
                            <p className="text-muted-foreground capitalize">
                              {req.type.replace('-', ' ')} • {new Date(req.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        );
                      })}
                      {pendingUnverified.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground">
                          +{pendingUnverified.length - 5} more
                        </p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
