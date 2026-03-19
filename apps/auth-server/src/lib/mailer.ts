import nodemailer from 'nodemailer';

// Create transporter once at module level
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup
export async function verifyMailer(): Promise<void> {
  try {
    // If no real credentials, log warning and return
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Mailer] WARNING: SMTP credentials missing. Delivery will fail.');
      return;
    }
    await transporter.verify();
    console.log('[Mailer] SMTP connection verified ✓');
  } catch (err) {
    console.error('[Mailer] SMTP connection FAILED:', err);
    console.error('[Mailer] OTP emails will not be delivered until SMTP is fixed');
  }
}

export async function sendOTPEmail(
  to: string,
  otp: string,
  name: string,
): Promise<void> {
  console.log(`[Mailer] Sending OTP email to ${to}`);
  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM ?? '"AuthSphere" <noreply@veltech.edu.in>',
      to,
      subject: `${otp} is your AuthSphere login code`,
      html:    buildOTPTemplate(otp, name),
      text:    `Your AuthSphere login code is: ${otp}\n\nExpires in 3 minutes.`,
    });
    console.log(`[Mailer] Email sent successfully. MessageId: ${info.messageId}`);
  } catch (err) {
    console.error('[Mailer] Failed to send OTP email:', err);
    throw err; // re-throw so caller knows delivery failed
  }
}

function buildOTPTemplate(otp: string, name: string): string {
  return `
  <!DOCTYPE html><html>
  <body style="margin:0;padding:0;background:#03050a;font-family:'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#0b1628;border:1px solid #172038;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#00d4ff,#7c3aed);padding:3px;"></td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 4px;font-size:22px;color:#00d4ff;">AuthSphere</h1>
              <p style="margin:0 0 28px;font-size:12px;color:#64748b;letter-spacing:2px;">
                VEL TECH UNIVERSITY · CAMPUS SSO
              </p>
              <p style="color:#e2e8f0;font-size:15px;margin:0 0 8px;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="color:#64748b;font-size:14px;margin:0 0 28px;">
                Your one-time login code is:
              </p>
              <div style="background:#07101f;border:1px solid #172038;border-radius:12px;
                          padding:28px;text-align:center;margin-bottom:28px;">
                <span style="font-size:48px;font-weight:800;letter-spacing:16px;
                             color:#00d4ff;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
              </div>
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);
                          border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#f59e0b;font-size:13px;">
                  ⏱ This code expires in <strong>3 minutes</strong>.
                  Do not share it with anyone.
                </p>
              </div>
              <p style="color:#3d5068;font-size:12px;margin:0;">
                If you did not request this login, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;border-top:1px solid #172038;">
              <p style="margin:0;color:#3d5068;font-size:11px;text-align:center;">
                AuthSphere — FIDO2 Passwordless SSO · Vel Tech University
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}
