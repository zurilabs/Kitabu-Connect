import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Check if Twilio is configured
const isTwilioConfigured = !!(accountSid && authToken && phoneNumber);

// Initialize Twilio client only if credentials are provided
let twilioClient: ReturnType<typeof twilio> | null = null;

if (isTwilioConfigured) {
  twilioClient = twilio(accountSid, authToken);
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<{ success: boolean; error?: string }> {
  // In development mode or if Twilio is not configured, just log the SMS
  if (process.env.NODE_ENV === "development" || !isTwilioConfigured) {
    console.log(`\n📱 [SMS Dev Mode] To: ${to}\nMessage: ${message}\n`);
    return { success: true };
  }

  // In production mode with Twilio configured, send actual SMS
  try {
    if (!twilioClient || !phoneNumber) {
      throw new Error("Twilio client not initialized");
    }

    await twilioClient.messages.create({
      body: message,
      from: phoneNumber,
      to: to,
    });

    console.log(`✓ SMS sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("[Twilio] Error sending SMS:", error);
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
