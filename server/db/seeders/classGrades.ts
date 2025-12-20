import { db } from "../../db.ts";
import { classGrades } from "../schema/index.ts";

export async function seedClassGrades() {
  await db.insert(classGrades).values([
    { name: "Grade 1", curriculum: "CBC", sortOrder: 1, ageRange: "6-7" },
    { name: "Grade 2", curriculum: "CBC", sortOrder: 2, ageRange: "7-8" },
    { name: "Grade 3", curriculum: "CBC", sortOrder: 3, ageRange: "8-9" },
    { name: "Grade 6", curriculum: "CBC", sortOrder: 6, ageRange: "11-12" },
    { name: "Form 1", curriculum: "8-4-4", sortOrder: 7, ageRange: "14-15" },
    { name: "Form 4", curriculum: "8-4-4", sortOrder: 10, ageRange: "17-18" },
  ]);
}
