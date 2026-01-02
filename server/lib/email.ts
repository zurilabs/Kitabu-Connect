// Email service configuration
const resendAPIKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || "Kitabu Connect <noreply@kitabu.connect>";

// Check if email service is configured
const isEmailConfigured = !!resendAPIKey;

// Log configuration status (without exposing secrets)
console.log('[Email] Configuration status:', {
  resendAPIKey: resendAPIKey ? `${resendAPIKey.substring(0, 10)}...` : 'NOT SET',
  fromEmail: fromEmail,
  isConfigured: isEmailConfigured,
  nodeEnv: process.env.NODE_ENV,
});

if (!isEmailConfigured) {
  console.warn('[Email] Service NOT initialized - missing RESEND_API_KEY');
  console.warn('Get your API key from: https://resend.com/api-keys');
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  // In development mode or if email is not configured, just log the email
  if (process.env.NODE_ENV === "development" || !isEmailConfigured) {
    console.log(`\n📧 [EMAIL ${process.env.NODE_ENV === "development" ? "Dev Mode" : "SKIPPED - Not Configured"}]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}\n`);

    if (!isEmailConfigured) {
      console.warn('⚠️ Resend API key not configured. Emails will not be sent in production!');
    }

    return { success: true };
  }

  // In production mode with email configured, send actual email via Resend API
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendAPIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to send email: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✓ [Email] Email sent successfully to ${to} (ID: ${result.id})`);
    return { success: true };
  } catch (error: any) {
    console.error("[Email] Error sending email:", {
      to,
      subject,
      error: error.message,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendOTPEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const subject = "Your Kitabu Connect Verification Code";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 12px 24px; border-radius: 12px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span style="font-size: 24px; font-weight: 700;">Kitabu Connect</span>
      </div>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 40px; margin-bottom: 24px;">
      <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111827;">Verify Your Email</h1>

      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #6b7280;">
        Welcome to Kitabu Connect! To complete your sign up, please use the verification code below:
      </p>

      <!-- OTP Code Box -->
      <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 42px; font-weight: 700; color: white; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Important:</strong> This code expires in 10 minutes. Never share this code with anyone.
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 8px 0;">
        This email was sent to ${email}
      </p>
      <p style="margin: 0;">
        © ${new Date().getFullYear()} Kitabu Connect. Kenya's trusted textbook marketplace.
      </p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to: email, subject, html });
}
