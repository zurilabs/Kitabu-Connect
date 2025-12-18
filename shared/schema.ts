import { mysqlTable, varchar, timestamp, boolean, decimal, int, text } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  fullName: text("full_name"),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("PARENT"), // 'PARENT' | 'ADMIN'

  // Onboarding fields
  schoolId: varchar("school_id", { length: 36 }),
  schoolName: text("school_name"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  childGrade: int("child_grade"), // 1-12
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),

  // Wallet
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const otpCodes = mysqlTable("otp_codes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schools = mysqlTable("schools", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  location: text("location"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Validation schemas
export const insertUserSchema = createInsertSchema(users).pick({
  phoneNumber: true,
  fullName: true,
  email: true,
});

export const sendOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
});

export const verifyOTPSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  code: z.string().length(6),
});

export const completeOnboardingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  schoolId: z.string(),
  schoolName: z.string(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  childGrade: z.number().min(1).max(12),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type OTPCode = typeof otpCodes.$inferSelect;
export type School = typeof schools.$inferSelect;
export type SendOTPInput = z.infer<typeof sendOTPSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
