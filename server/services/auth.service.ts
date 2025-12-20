import { db } from "../db";
import { users, otpCodes, type User } from "server/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { generateToken } from "../lib/jwt";
import { sendSMS, formatKenyanPhoneNumber } from "../lib/twilio";

export class AuthService {
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Format phone number to Kenyan format with country code
      const formattedPhone = formatKenyanPhoneNumber(phoneNumber);

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await db.insert(otpCodes).values({
        phoneNumber,
        code,
        expiresAt,
        verified: false,
      });

      // Send OTP via SMS using Twilio
      const smsMessage = `Your Kitabu Connect verification code is: ${code}. This code expires in 10 minutes.`;
      const smsResult = await sendSMS({
        to: formattedPhone,
        message: smsMessage,
      });

      if (!smsResult.success) {
        console.error("[AuthService] Failed to send SMS:", smsResult.error);
        // Still return success as OTP is stored in DB
        // In dev mode, user can see it in console
      }

      // In development mode, include code in response for testing
      const isDev = process.env.NODE_ENV === "development";
      return {
        success: true,
        message: isDev
          ? `OTP sent to ${formattedPhone}. Code: ${code} (dev mode)`
          : `OTP sent to ${formattedPhone}`,
      };
    } catch (error) {
      console.error("[AuthService] sendOTP error:", error);
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
      };
    }
  }

  async verifyOTP(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; token?: string; user?: User; isNewUser?: boolean; message?: string }> {
    try {
      // Find valid OTP
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.phoneNumber, phoneNumber),
            eq(otpCodes.code, code),
            eq(otpCodes.verified, false),
            gt(otpCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!otpRecord) {
        return {
          success: false,
          message: "Invalid or expired OTP code",
        };
      }

      // Mark OTP as verified
      await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otpRecord.id));

      // Check if user exists
      let [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);

      let isNewUser = false;

      // Create new user if doesn't exist
      if (!user) {
        isNewUser = true;

        // Determine role based on email (will be set during onboarding)
        const role = "PARENT"; // Default role

        const [newUser] = await db
          .insert(users)
          .values({
            phoneNumber,
            role,
            onboardingCompleted: false,
          })
          .$returningId();

        // Fetch the created user
        [user] = await db.select().from(users).where(eq(users.id, newUser.id)).limit(1);
      }

      // Generate JWT token
      const token = await generateToken(user);

      return {
        success: true,
        token,
        user,
        isNewUser,
      };
    } catch (error) {
      console.error("[AuthService] verifyOTP error:", error);
      return {
        success: false,
        message: "Failed to verify OTP. Please try again.",
      };
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user || null;
    } catch (error) {
      console.error("[AuthService] getUserById error:", error);
      return null;
    }
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);
      return user || null;
    } catch (error) {
      console.error("[AuthService] getUserByPhoneNumber error:", error);
      return null;
    }
  }
}

export const authService = new AuthService();
