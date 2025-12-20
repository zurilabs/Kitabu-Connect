import { db } from "../../db.ts";
import { users } from "../schema/index.ts";
import { randomUUID } from "crypto";

export async function seedUsers() {
  await db.insert(users).values([
    {
      id: randomUUID(),
      phoneNumber: "+254712345678",
      fullName: "John Mwangi",
      email: "john@example.com",
      role: "PARENT",
      schoolName: "Thika Primary School",
      onboardingCompleted: true,
      walletBalance: "1500.00",
    },
    {
      id: randomUUID(),
      phoneNumber: "+254723456789",
      fullName: "Mary Wanjiku",
      email: "mary@example.com",
      role: "PARENT",
      schoolName: "Murang'a High School",
      onboardingCompleted: true,
      walletBalance: "800.00",
    },
    {
      id: randomUUID(),
      phoneNumber: "+254700000001",
      fullName: "System Admin",
      role: "ADMIN",
      onboardingCompleted: true,
    },
  ]);
}
