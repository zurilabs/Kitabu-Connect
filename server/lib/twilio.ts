import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Check if Twilio is configured
const isTwilioConfigured = !!(accountSid && authToken && phoneNumber);

// Log configuration status (without exposing secrets)
console.log('[Twilio] Configuration status:', {
  accountSid: accountSid ? `${accountSid.substring(0, 10)}...` : 'NOT SET',
  authToken: authToken ? 'SET' : 'NOT SET',
  phoneNumber: phoneNumber || 'NOT SET',
  isConfigured: isTwilioConfigured,
  nodeEnv: process.env.NODE_ENV,
});

console.warn('⚠️ IMPORTANT: The phone number in .env (+254721257308) is NOT a Twilio number!');
console.warn('You need to either:');
console.warn('1. Buy a Twilio phone number from console.twilio.com');
console.warn('2. Create a Messaging Service in Twilio');
console.warn('3. For trial accounts, you can only send to verified numbers');

// Initialize Twilio client only if credentials are provided
let twilioClient: ReturnType<typeof twilio> | null = null;

if (isTwilioConfigured) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[Twilio] Client initialized successfully');
} else {
  console.warn('[Twilio] Client NOT initialized - missing credentials');
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<{ success: boolean; error?: string }> {
  // In development mode or if Twilio is not configured, just log the SMS
  if (process.env.NODE_ENV === "development" || !isTwilioConfigured) {
    console.log(`\n📱 [SMS ${process.env.NODE_ENV === "development" ? "Dev Mode" : "SKIPPED - Not Configured"}]`);
    console.log(`To: ${to}`);
    console.log(`Message: ${message}\n`);

    if (!isTwilioConfigured) {
      console.warn('⚠️ Twilio credentials not configured. SMS will not be sent in production!');
    }

    return { success: true };
  }

  // In production mode with Twilio configured, send actual SMS
  try {
    if (!twilioClient || !phoneNumber) {
      const error = "Twilio client not initialized";
      console.error(`[Twilio] ${error}`);
      throw new Error(error);
    }

    console.log(`[Twilio] Attempting to send SMS to ${to}...`);

    const result = await twilioClient.messages.create({
      body: message,
      from: phoneNumber,
      to: to,
    });

    console.log(`✓ [Twilio] SMS sent successfully to ${to} (SID: ${result.sid})`);
    return { success: true };
  } catch (error: any) {
    console.error("[Twilio] Error sending SMS:", {
      to,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}

export function formatKenyanPhoneNumber(phoneNumber: string): string {
  // Remove any spaces, hyphens, or parentheses
  let cleaned = phoneNumber.replace(/[\s\-()]/g, "");

  // If it starts with 0, replace with +254
  if (cleaned.startsWith("0")) {
    cleaned = "+254" + cleaned.substring(1);
  }
  // If it starts with 254 (without +), add +
  else if (cleaned.startsWith("254") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  // If it doesn't start with + or 254, assume it's missing country code
  else if (!cleaned.startsWith("+254")) {
    cleaned = "+254" + cleaned;
  }

  return cleaned;
}
