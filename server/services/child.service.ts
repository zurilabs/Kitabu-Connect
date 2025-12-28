import { db } from "../db.ts";
import { children, users, type CreateChildInput, type UpdateChildInput } from "../db/schema/index.ts";
import { eq, and, asc } from "drizzle-orm";

class ChildService {
  /**
   * Get all children for a parent
   */
  async getChildrenByParent(parentId: string) {
    try {
      const childrenList = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId))
        .orderBy(asc(children.displayOrder), asc(children.createdAt));

      return { success: true, children: childrenList };
    } catch (error) {
      console.error("Error fetching children:", error);
      throw new Error("Failed to fetch children");
    }
  }

  /**
   * Get a single child by ID
   */
  async getChildById(childId: number, parentId: string) {
    try {
      const [child] = await db
        .select()
        .from(children)
        .where(
          and(
            eq(children.id, childId),
            eq(children.parentId, parentId)
          )
        );

      if (!child) {
        return { success: false, message: "Child not found" };
      }

      return { success: true, child };
    } catch (error) {
      console.error("Error fetching child:", error);
      throw new Error("Failed to fetch child");
    }
  }

  /**
   * Create a new child
   */
  async createChild(parentId: string, data: CreateChildInput) {
    try {
      // Get current max displayOrder for this parent
      const existingChildren = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId));

      const maxOrder = existingChildren.reduce(
        (max, child) => Math.max(max, child.displayOrder),
        -1
      );

      const [newChild] = await db.insert(children).values({
        parentId,
        name: data.name || null,
        grade: data.grade,
        schoolId: data.schoolId || null,
        schoolName: data.schoolName || null,
        displayOrder: maxOrder + 1,
      });

      // Fetch the created child
      const [createdChild] = await db
        .select()
        .from(children)
        .where(eq(children.id, newChild.insertId));

      return { success: true, child: createdChild };
    } catch (error) {
      console.error("Error creating child:", error);
      throw new Error("Failed to create child");
    }
  }

  /**
   * Update child information
   */
  async updateChild(childId: number, parentId: string, data: UpdateChildInput) {
    try {
      // Verify child belongs to parent
      const [existingChild] = await db
        .select()
        .from(children)
        .where(
          and(
            eq(children.id, childId),
            eq(children.parentId, parentId)
          )
        );

      if (!existingChild) {
        return { success: false, message: "Child not found or unauthorized" };
      }

      // Update the child
      await db
        .update(children)
        .set({
          name: data.name !== undefined ? data.name : existingChild.name,
          grade: data.grade || existingChild.grade,
          schoolId: data.schoolId !== undefined ? data.schoolId : existingChild.schoolId,
          schoolName: data.schoolName !== undefined ? data.schoolName : existingChild.schoolName,
          displayOrder: data.displayOrder !== undefined ? data.displayOrder : existingChild.displayOrder,
        })
        .where(eq(children.id, childId));

      // Fetch updated child
      const [updatedChild] = await db
        .select()
        .from(children)
        .where(eq(children.id, childId));

      return { success: true, child: updatedChild };
    } catch (error) {
      console.error("Error updating child:", error);
      throw new Error("Failed to update child");
    }
  }

  /**
   * Delete a child
   */
  async deleteChild(childId: number, parentId: string) {
    try {
      // Verify child belongs to parent
      const [existingChild] = await db
        .select()
        .from(children)
        .where(
          and(
            eq(children.id, childId),
            eq(children.parentId, parentId)
          )
        );

      if (!existingChild) {
        return { success: false, message: "Child not found or unauthorized" };
      }

      // Delete the child
      await db
        .delete(children)
        .where(eq(children.id, childId));

      // Reorder remaining children to fill the gap
      const remainingChildren = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId))
        .orderBy(asc(children.displayOrder));

      // Update display orders
      for (let i = 0; i < remainingChildren.length; i++) {
        await db
          .update(children)
          .set({ displayOrder: i })
          .where(eq(children.id, remainingChildren[i].id));
      }

      return { success: true, message: "Child deleted successfully" };
    } catch (error) {
      console.error("Error deleting child:", error);
      throw new Error("Failed to delete child");
    }
  }

  /**
   * Reorder children
   */
  async reorderChildren(parentId: string, childrenOrder: Array<{ id: number; displayOrder: number }>) {
    try {
      // Verify all children belong to parent
      const childIds = childrenOrder.map(c => c.id);
      const existingChildren = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId));

      const validIds = existingChildren.map(c => c.id);
      const allValid = childIds.every(id => validIds.includes(id));

      if (!allValid) {
        return { success: false, message: "One or more children not found" };
      }

      // Update display orders
      for (const { id, displayOrder } of childrenOrder) {
        await db
          .update(children)
          .set({ displayOrder })
          .where(eq(children.id, id));
      }

      // Fetch updated children
      const updatedChildren = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId))
        .orderBy(asc(children.displayOrder));

      return { success: true, children: updatedChildren };
    } catch (error) {
      console.error("Error reordering children:", error);
      throw new Error("Failed to reorder children");
    }
  }

  /**
   * Get formatted child name for display
   * Returns the child's name if set, otherwise "Child N"
   */
  getChildDisplayName(child: any, index: number): string {
    return child.name || `Child ${index + 1}`;
  }

  /**
   * Migrate existing childGrade data to children table
   * Run this once during deployment
   */
  async migrateExistingChildGrades() {
    try {
      // Find all users with childGrade set
      const usersWithGrade = await db
        .select({
          id: users.id,
          childGrade: users.childGrade,
        })
        .from(users)
        .where(eq(users.childGrade, users.childGrade)); // Only users with childGrade

      let migratedCount = 0;

      for (const user of usersWithGrade) {
        if (user.childGrade === null || user.childGrade === undefined) continue;

        // Check if this user already has children
        const existingChildren = await db
          .select()
          .from(children)
          .where(eq(children.parentId, user.id));

        if (existingChildren.length > 0) {
          // User already migrated
          continue;
        }

        // Create child with "My Child" name
        const gradeString = `Grade ${user.childGrade}`;
        await db.insert(children).values({
          parentId: user.id,
          name: "My Child",
          grade: gradeString,
          displayOrder: 0,
        });

        migratedCount++;
      }

      return {
        success: true,
        message: `Migrated ${migratedCount} users with childGrade to children table`,
        migratedCount,
      };
    } catch (error) {
      console.error("Error migrating childGrade data:", error);
      throw new Error("Failed to migrate childGrade data");
    }
  }
}

export const childService = new ChildService();
