import nodemailer from 'nodemailer';

// ─────────────────────────────────────────────────────────
// Environment variables required:
//   GMAIL_USER          – your Gmail address (e.g. hostel.admin@gmail.com)
//   GMAIL_APP_PASSWORD  – 16-char App Password (Google → Security → 2-Step → App Passwords)
//   APP_URL             – frontend URL (default: http://localhost:5173)
// ─────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Allow connections through proxies / corporate firewalls
  },
});

interface TaskEmailPayload {
  staffId: string;
  staffEmail: string;
  staffName: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority: string;
  taskCategory: string;
  taskDueDate: string;
  assignedByName: string;
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#D1FAE5', text: '#065F46' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FED7AA', text: '#9A3412' },
  urgent: { bg: '#FEE2E2', text: '#991B1B' },
};

export async function sendTaskAssignmentEmail(payload: TaskEmailPayload): Promise<void> {
  const {
    staffId,
    staffEmail,
    staffName,
    taskTitle,
    taskDescription,
    taskPriority,
    taskCategory,
    taskDueDate,
    assignedByName,
  } = payload;

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  // Encode staffId + staffEmail as base64 token for auto-login
  const token = Buffer.from(`${staffId}|${staffEmail}`).toString('base64');
  const startTaskUrl = `${appUrl}/task-start?token=${encodeURIComponent(token)}`;

  const pColor = priorityColors[taskPriority] || priorityColors.medium;

  const formattedDate = new Date(taskDueDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Task Assigned</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E40AF,#3B82F6);padding:28px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🏢 TC Hostel Connect</h1>
              <p style="margin:6px 0 0;color:#BFDBFE;font-size:13px;">Staff Task Management System</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">New Task Assigned to You</h2>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.5;">
                Hi <strong>${staffName}</strong>,<br/>
                A new task has been assigned to you by <strong>${assignedByName}</strong>.
              </p>

              <!-- Task Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <h3 style="margin:0 0 12px;color:#111827;font-size:17px;">${taskTitle}</h3>
                    <p style="margin:0 0 16px;color:#4B5563;font-size:14px;line-height:1.6;">${taskDescription}</p>
                    
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <span style="display:inline-block;background:${pColor.bg};color:${pColor.text};font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;text-transform:uppercase;">
                            ${taskPriority} priority
                          </span>
                        </td>
                        <td style="padding-right:12px;">
                          <span style="display:inline-block;background:#E0E7FF;color:#3730A3;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;text-transform:capitalize;">
                            ${taskCategory}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:16px 0 0;color:#6B7280;font-size:13px;">
                      📅 <strong>Due Date:</strong> ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${startTaskUrl}" target="_blank"
                       style="display:inline-block;background:#DC2626;color:#ffffff;font-size:18px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:10px;box-shadow:0 4px 14px rgba(220,38,38,0.4);letter-spacing:0.3px;">
                      🚀 START TASK
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <p style="margin:0;color:#9CA3AF;font-size:12px;">Click the button above to open your tasks dashboard</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                This is an automated notification from TC Hostel Connect.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"TC Hostel Connect" <${process.env.GMAIL_USER}>`,
    to: staffEmail,
    subject: `📋 New Task Assigned: ${taskTitle}`,
    html: htmlBody,
  });

  console.log(`✅ Task assignment email sent to ${staffEmail}`);
}
