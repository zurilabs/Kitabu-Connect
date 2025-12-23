import { db } from "../../db.ts";
import { schools } from "../schema/index.ts";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SchoolFeature {
  type: string;
  id: number;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    OBJECTID: number;
    CODE: number;
    SCHOOL_NAM: string;
    LEVEL: string;
    Status: string;
    County: string;
    DISTRICT: string;
    ZONE: string;
    SUB_COUNTY: string;
    Ward: string;
    X_Coord: number;
    Y_Coord: number;
    Source: string;
  };
}

interface SchoolGeoJSON {
  type: string;
  crs: unknown; // Replaced 'any' with 'unknown' for linting
  features: SchoolFeature[];
}

export async function seedSchools() {
  console.log("📚 Starting schools seeding (Limited to 100) from external_resource/schools.json...");

  try {
    const filePath = path.join(__dirname, "../../../external_resource/schools.json");
    console.log(`📖 Reading file: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const geoData: SchoolGeoJSON = JSON.parse(fileContent);

    // LIMITATION LOGIC: Capture only the first 100 schools
    const allFeatures = geoData.features;
    const featuresToSeed = allFeatures.slice(0, 100);

    console.log(`✅ Total schools in file: ${allFeatures.length}`);
    console.log(`🎯 Targeted for seeding: ${featuresToSeed.length}`);

    let totalImported = 0;
    let errorCount = 0;

    // Process the 100 schools (Batching is kept for safety, though only 1 loop will run)
    const batchSize = 100; 
    
    for (let i = 0; i < featuresToSeed.length; i += batchSize) {
      const batch = featuresToSeed.slice(i, i + batchSize);

      const schoolData = batch.map((feature) => ({
        id: randomUUID(),
        code: feature.properties.CODE ?? null, // Use nullish coalescing
        schoolName: feature.properties.SCHOOL_NAM,
        level: feature.properties.LEVEL ?? null,
        status: feature.properties.Status ?? null,
        county: feature.properties.County ?? null,
        district: feature.properties.DISTRICT ?? null,
        zone: feature.properties.ZONE ?? null,
        subCounty: feature.properties.SUB_COUNTY ?? null,
        ward: feature.properties.Ward ?? null,
        xCoord: feature.properties.X_Coord?.toString() ?? null,
        yCoord: feature.properties.Y_Coord?.toString() ?? null,
        source: feature.properties.Source ?? "Ministry of Education, 2016",
      }));

      try {
        await db.insert(schools).values(schoolData);
        totalImported += batch.length;
        
        const progress = Math.round((totalImported / featuresToSeed.length) * 100);
        console.log(`⏳ Progress: ${progress}% (${totalImported}/${featuresToSeed.length} schools)`);
      } catch (dbError: unknown) {
        // Use unique variable name and type safety for linting
        const message = dbError instanceof Error ? dbError.message : String(dbError);
        console.error(`❌ Error seeding batch:`, message);
        errorCount += batch.length;
      }
    }

    console.log("\n📊 Seeding Summary:");
    console.log(`   Total in file: ${allFeatures.length}`);
    console.log(`   Successfully seeded: ${totalImported}`);
    console.log(`   Errors: ${errorCount}`);
    console.log("\n✅ Schools seeding completed!");

  } catch (fatalError: unknown) {
    const message = fatalError instanceof Error ? fatalError.message : String(fatalError);
    console.error("❌ Fatal error during schools seeding:", message);
    throw fatalError;
  }
}