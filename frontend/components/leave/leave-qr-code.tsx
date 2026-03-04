import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Phone, ShieldCheck, User } from 'lucide-react';

interface LeaveQRCodeProps {
  parentPhone: string;
  parentName: string;
  studentName: string;
  leaveRequestId: string;
  compact?: boolean;
}

/**
 * Mask phone number for privacy display.
 * E.g., "+919876543210" → "+91 ****3210"
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  const last4 = digits.slice(-4);
  const prefix = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
  return `${prefix}****${last4}`;
}

export function LeaveQRCode({ parentPhone, parentName, studentName, leaveRequestId, compact }: LeaveQRCodeProps) {
  // Encode the phone number as a tel: URI so scanning opens the native dialer
  // QR data includes both the phone and metadata for the scanner to parse
  const qrData = JSON.stringify({
    type: 'leave-parent-call',
    phone: parentPhone,
    leaveRequestId,
    studentName,
    parentName,
  });

  if (compact) {
    return (
      <div className="flex items-center space-x-3 rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 p-3">
        <QRCodeSVG
          value={qrData}
          size={72}
          level="M"
          bgColor="transparent"
          fgColor="#4f46e5"
          includeMargin={false}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Scan to Call Parent
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {parentName} • {maskPhone(parentPhone)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Phone className="h-4 w-4" />
          Scan to Call Parent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-center">
          <div className="rounded-xl bg-white p-3 shadow-sm border">
            <QRCodeSVG
              value={qrData}
              size={140}
              level="M"
              bgColor="#ffffff"
              fgColor="#312e81"
              includeMargin={false}
            />
          </div>
        </div>
        <div className="space-y-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{parentName}</span>
          </div>
          <p className="text-xs text-muted-foreground">{maskPhone(parentPhone)}</p>
        </div>
        <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/40 p-2 text-center">
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admin/Warden must scan & call before approving
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
