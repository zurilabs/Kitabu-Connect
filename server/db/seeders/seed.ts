import { seedUsers } from "./users.ts";
import { seedSubjects } from "./subjects.ts";
import { seedClassGrades } from "./classGrades.ts";
import { seedPublishers } from "./publishers.ts";
import { seedBookListings } from "./bookListings.ts";
import { seedBookPhotos } from "./bookPhotos.ts";
import { seedSchools } from "./schools.ts";

async function runSeed() {
  console.log("🌱 Seeding database...");

  await seedSchools();
  // await seedUsers();
  // await seedSubjects();
  // await seedClassGrades();
  // await seedPublishers();
  // await seedBookListings();
  // await seedBookPhotos();

  console.log("✅ Seeding completed");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
