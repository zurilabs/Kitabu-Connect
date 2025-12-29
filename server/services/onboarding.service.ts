import { db } from "../db";
import { users, children, type User, type CompleteOnboardingInput } from "server/db/schema";
import { eq } from "drizzle-orm";

export class OnboardingService {
  async completeOnboarding(userId: string, data: CompleteOnboardingInput): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Determine role based on email
      const role = data.email.endsWith("@kitabu.admin") ? "ADMIN" : "PARENT";

      // Update user with onboarding data (without school fields)
      await db
        .update(users)
        .set({
          fullName: data.fullName,
          email: data.email,
          role,
          latitude: data.latitude !== null && data.latitude !== undefined ? data.latitude.toString() : null,
          longitude: data.longitude !== null && data.longitude !== undefined ? data.longitude.toString() : null,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Create child records if provided
      if (data.children && data.children.length > 0) {
        // Get current max displayOrder
        const existingChildren = await db
          .select()
          .from(children)
          .where(eq(children.parentId, userId));

        let maxOrder = existingChildren.reduce(
          (max, child) => Math.max(max, child.displayOrder),
          -1
        );

        for (const child of data.children) {
          maxOrder += 1;
          await db.insert(children).values({
            parentId: userId,
            name: child.name || null,
            grade: child.grade,
            schoolId: child.schoolId,
            schoolName: child.schoolName,
            displayOrder: maxOrder,
          });
        }
      }

      // Fetch updated user
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!updatedUser) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      console.error("[OnboardingService] completeOnboarding error:", error);
      return {
        success: false,
        message: "Failed to complete onboarding. Please try again.",
      };
    }
  }

  async checkOnboardingStatus(userId: string): Promise<{ completed: boolean; user?: User }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return { completed: false };
      }

      return {
        completed: user.onboardingCompleted,
        user,
      };
    } catch (error) {
      console.error("[OnboardingService] checkOnboardingStatus error:", error);
      return { completed: false };
    }
  }
}

export const onboardingService = new OnboardingService();
