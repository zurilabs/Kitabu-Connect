import { db } from "../db";
import { schools } from "@shared/schema";

const INITIAL_SCHOOLS = [
  { name: "Thika High School for the Blind", location: "Thika, Kiambu County", latitude: "-1.0369", longitude: "37.0898" },
  { name: "St. Mary's School Thika", location: "Thika, Kiambu County", latitude: "-1.0275", longitude: "37.0985" },
  { name: "Thika Primary School", location: "Thika Town, Kiambu County", latitude: "-1.0332", longitude: "37.0690" },
  { name: "Kiandutu Primary School", location: "Kiandutu, Thika", latitude: "-1.0450", longitude: "37.0820" },
  { name: "Gatuanyaga Secondary School", location: "Gatuanyaga, Thika", latitude: "-1.0158", longitude: "37.1025" },
  { name: "Makongeni Primary School", location: "Makongeni, Thika", latitude: "-1.0410", longitude: "37.0750" },
  { name: "Murang'a High School", location: "Murang'a Town, Murang'a County", latitude: "-0.7211", longitude: "37.1526" },
  { name: "Kagumo High School", location: "Kagumo, Murang'a County", latitude: "-0.6945", longitude: "37.1320" },
  { name: "Bishop Gatimu Ngandu Girls High School", location: "Karatina, Murang'a County", latitude: "-0.4833", longitude: "37.1333" },
  { name: "Murang'a Township Primary School", location: "Murang'a Town, Murang'a County", latitude: "-0.7180", longitude: "37.1490" },
  { name: "St. Joseph's Primary School Thika", location: "Thika, Kiambu County", latitude: "-1.0295", longitude: "37.0845" },
  { name: "Gatanga Mixed Secondary School", location: "Gatanga, Murang'a County", latitude: "-0.9167", longitude: "37.0500" },
  { name: "Kihumbuini Secondary School", location: "Kihumbuini, Murang'a County", latitude: "-0.7850", longitude: "37.1150" },
  { name: "Kandara Girls High School", location: "Kandara, Murang'a County", latitude: "-0.8333", longitude: "37.0000" },
  { name: "Blue Valley Primary School", location: "Blue Valley, Thika", latitude: "-1.0520", longitude: "37.0980" },
  { name: "Mount Kenya Academy", location: "Thika, Kiambu County", latitude: "-1.0245", longitude: "37.0920" },
  { name: "Kahuhia Girls High School", location: "Kahuhia, Murang'a County", latitude: "-0.6500", longitude: "37.2167" },
  { name: "Ichagaki Secondary School", location: "Ichagaki, Murang'a County", latitude: "-0.7667", longitude: "37.1833" },
  { name: "Muthithi Primary School", location: "Muthithi, Murang'a County", latitude: "-0.7420", longitude: "37.1620" },
  { name: "Township Primary School Thika", location: "Thika Town, Kiambu County", latitude: "-1.0348", longitude: "37.0715" },
];

async function seed() {
  try {
    console.log("Seeding schools...");

    // Check if schools already exist
    const existingSchools = await db.select().from(schools);

    if (existingSchools.length > 0) {
      console.log(`${existingSchools.length} schools already exist. Skipping seed.`);
      return;
    }

    // Insert schools
    await db.insert(schools).values(INITIAL_SCHOOLS);

    console.log(`✓ Successfully seeded ${INITIAL_SCHOOLS.length} schools`);
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
