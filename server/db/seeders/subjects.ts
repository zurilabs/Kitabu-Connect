import { db } from "../../db.ts";
import { subjects } from "../schema/index.ts";

export async function seedSubjects() {
  await db.insert(subjects).values([
    { name: "Mathematics", sortOrder: 1 },
    { name: "English", sortOrder: 2 },
    { name: "Kiswahili", sortOrder: 3 },
    { name: "Science", sortOrder: 4 },
    { name: "Social Studies", sortOrder: 5 },
    { name: "CRE", sortOrder: 6 },
  ]);
}
