import { db } from "../db";
import { users, otpCodes, type User } from "server/db/schema";
import { eq, and, gt, or } from "drizzle-orm";
import { generateToken } from "../lib/jwt";
import { sendOTPEmail } from "../lib/email";

export class AuthService {
  /**
   * Send OTP verification code to user's email
   */
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          message: "Invalid email address",
        };
      }

      // Normalize email (lowercase)
      const normalizedEmail = email.toLowerCase().trim();

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await db.insert(otpCodes).values({
        email: normalizedEmail,
        code,
        expiresAt,
        verified: false,
      });

      // Send OTP via email
      const emailResult = await sendOTPEmail(normalizedEmail, code);

      if (!emailResult.success) {
        console.error("[AuthService] Failed to send email:", emailResult.error);
        // Still return success as OTP is stored in DB
        // In dev mode, user can see it in console
      }

      // In development mode, include code in response for testing
      const isDev = process.env.NODE_ENV === "development";
      return {
        success: true,
        message: isDev
          ? `OTP sent to ${normalizedEmail}. Code: ${code} (dev mode)`
          : `Verification code sent to ${normalizedEmail}`,
      };
    } catch (error) {
      console.error("[AuthService] sendOTP error:", error);
      return {
        success: false,
        message: "Failed to send verification code. Please try again.",
      };
    }
  }

  /**
   * Verify OTP code and authenticate user
   */
  async verifyOTP(
    email: string,
    code: string
  ): Promise<{ success: boolean; token?: string; user?: User; isNewUser?: boolean; message?: string }> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Find valid OTP
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.email, normalizedEmail),
            eq(otpCodes.code, code),
            eq(otpCodes.verified, false),
            gt(otpCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!otpRecord) {
        return {
          success: false,
          message: "Invalid or expired verification code",
        };
      }

      // Mark OTP as verified
      await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, otpRecord.id));

      // Check if user exists (by email)
      let [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

      let isNewUser = false;

      // Create new user if doesn't exist
      if (!user) {
        isNewUser = true;

        const [newUser] = await db
          .insert(users)
          .values({
            email: normalizedEmail,
            authProvider: "email",
            role: "PARENT", // Default role
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
        message: "Failed to verify code. Please try again.",
      };
    }
  }

  /**
   * Authenticate or create user via Google OAuth
   */
  async authenticateWithGoogle(
    googleId: string,
    email: string,
    fullName?: string,
    profilePictureUrl?: string
  ): Promise<{ success: boolean; token?: string; user?: User; isNewUser?: boolean; message?: string }> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists (by Google ID or email)
      let [user] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.googleId, googleId),
            eq(users.email, normalizedEmail)
          )
        )
        .limit(1);

      let isNewUser = false;

      if (!user) {
        // Create new user with Google OAuth
        isNewUser = true;

        const [newUser] = await db
          .insert(users)
          .values({
            email: normalizedEmail,
            googleId,
            fullName,
            profilePictureUrl,
            authProvider: "google",
            role: "PARENT",
            onboardingCompleted: false,
          })
          .$returningId();

        [user] = await db.select().from(users).where(eq(users.id, newUser.id)).limit(1);
      } else if (!user.googleId) {
        // Link Google account to existing email user
        await db
          .update(users)
          .set({
            googleId,
            fullName: fullName || user.fullName,
            profilePictureUrl: profilePictureUrl || user.profilePictureUrl,
          })
          .where(eq(users.id, user.id));

        [user] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
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
      console.error("[AuthService] authenticateWithGoogle error:", error);
      return {
        success: false,
        message: "Failed to authenticate with Google. Please try again.",
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return user || null;
    } catch (error) {
      console.error("[AuthService] getUserById error:", error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      return user || null;
    } catch (error) {
      console.error("[AuthService] getUserByEmail error:", error);
      return null;
    }
  }

  /**
   * Get user by Google ID
   */
  async getUserByGoogleId(googleId: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
      return user || null;
    } catch (error) {
      console.error("[AuthService] getUserByGoogleId error:", error);
      return null;
    }
  }
}

export const authService = new AuthService();
