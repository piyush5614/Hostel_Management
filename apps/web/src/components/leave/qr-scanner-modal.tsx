import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Camera, Phone, CheckCircle, AlertTriangle, User, FileText, ImagePlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface QRScanResult {
  type: string;
  phone: string;
  leaveRequestId: string;
  studentName: string;
  parentName: string;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallConfirmed: (data: {
    leaveRequestId: string;
    phone: string;
    studentName: string;
    parentName: string;
    notes: string;
  }) => void;
}

type ScanStep = 'scanning' | 'scanned' | 'calling' | 'confirming';

export function QRScannerModal({ isOpen, onClose, onCallConfirmed }: QRScannerModalProps) {
  const [step, setStep] = useState<ScanStep>('scanning');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [callConfirmed, setCallConfirmed] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-scanner-container';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
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
    // Wait for DOM element to be available
    await new Promise((resolve) => setTimeout(resolve, 300));

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
              // Stop scanning after successful read
              html5Qrcode.stop().catch(() => {});
            } else {
              setError('Invalid QR code. Please scan a leave request QR code.');
            }
          } catch {
            setError('Invalid QR code format. Please scan a leave request QR code.');
          }
        },
        () => {
          // QR code scan error (no code found in frame) — ignore
        }
      );
    } catch (err: any) {
      if (err?.toString?.().includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setError('Could not start camera. Please ensure a camera is available.');
      }
    }
  }, [stopScanner]);

  useEffect(() => {
    if (isOpen && step === 'scanning') {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, step, startScanner, stopScanner]);

  const handleClose = useCallback(() => {
    stopScanner();
    setStep('scanning');
    setScanResult(null);
    setCallConfirmed(false);
    setCallNotes('');
    setError(null);
    onClose();
  }, [stopScanner, onClose]);

  const handleCallNow = () => {
    if (!scanResult) return;
    // Open native dialer with the parent's phone number
    window.location.href = `tel:${scanResult.phone}`;
    setStep('confirming');
  };

  const handleConfirmCall = () => {
    if (!scanResult || !callConfirmed) return;
    onCallConfirmed({
      leaveRequestId: scanResult.leaveRequestId,
      phone: scanResult.phone,
      studentName: scanResult.studentName,
      parentName: scanResult.parentName,
      notes: callNotes,
    });
    handleClose();
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
    // Reset file input so same file can be re-selected
    e.target.value = '';

    try {
      setError(null);
      const html5Qrcode = new Html5Qrcode('qr-file-scanner-temp');
      const decodedText = await html5Qrcode.scanFile(file, /* showImage */ false);
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="QR Scanner — Parent Call Verification" size="md">
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs">
          {(['scanning', 'scanned', 'confirming'] as ScanStep[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className={cn('h-px w-6', step === s || (['scanned', 'confirming'].includes(step) && i <= 2) ? 'bg-indigo-400' : 'bg-gray-300')} />}
              <div className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 font-medium',
                step === s ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-muted-foreground'
              )}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">{i + 1}</span>
                <span className="capitalize">{s === 'scanning' ? 'Scan' : s === 'scanned' ? 'Call' : 'Confirm'}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Hidden elements */}
        <div id="qr-file-scanner-temp" className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Step: Scanning */}
        {step === 'scanning' && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-black relative" style={{ minHeight: 280 }}>
              <div id={scannerContainerId} className="w-full" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Camera className="inline h-4 w-4 mr-1 -mt-0.5" />
              Point camera at the leave request QR code
            </p>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <span className="relative bg-white dark:bg-gray-900 px-3 text-xs text-muted-foreground">or</span>
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload QR Image from Gallery
            </Button>
          </div>
        )}

        {/* Step: Scanned — show details & call button */}
        {step === 'scanned' && scanResult && (
          <div className="space-y-4">
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4 space-y-3">
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
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Request ID:</span>
                  </div>
                  <span className="font-medium text-xs">{scanResult.leaveRequestId}</span>
                </div>
              </CardContent>
            </Card>

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

        {/* Step: Confirming — after call, confirm and add notes */}
        {step === 'confirming' && scanResult && (
          <div className="space-y-4">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">
                  <Phone className="inline h-4 w-4 mr-1 -mt-0.5" />
                  Call placed to {scanResult.parentName} ({scanResult.phone})
                </p>
                <p className="text-xs text-muted-foreground">
                  For student: {scanResult.studentName}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={callConfirmed}
                  onChange={(e) => setCallConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">
                  I confirm I spoke with the parent (<strong>{scanResult.parentName}</strong>) regarding 
                  this leave request and the parent has given verbal permission.
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">Call Notes (optional)</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Any notes from the conversation with the parent..."
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

            {!callConfirmed && (
              <p className="text-xs text-center text-muted-foreground">
                You must check the confirmation box to proceed with leave approval
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
