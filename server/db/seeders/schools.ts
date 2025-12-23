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
  crs: any;
  features: SchoolFeature[];
}

export async function seedSchools() {
  console.log("📚 Starting schools seeding from external_resource/schools.json...");

  try {
    // Read the GeoJSON file
    const filePath = path.join(__dirname, "../../../external_resource/schools.json");
    console.log(`📖 Reading file: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const geoData: SchoolGeoJSON = JSON.parse(fileContent);

    console.log(`✅ Found ${geoData.features.length} schools to seed`);

    // Process schools in batches for better performance
    const batchSize = 1000;
    let totalImported = 0;
    let errors = 0;

    for (let i = 0; i < geoData.features.length; i += batchSize) {
      const batch = geoData.features.slice(i, i + batchSize);

      const schoolData = batch.map((feature) => ({
        id: randomUUID(),
        code: feature.properties.CODE || null,
        schoolName: feature.properties.SCHOOL_NAM,
        level: feature.properties.LEVEL || null,
        status: feature.properties.Status || null,
        county: feature.properties.County || null,
        district: feature.properties.DISTRICT || null,
        zone: feature.properties.ZONE || null,
        subCounty: feature.properties.SUB_COUNTY || null,
        ward: feature.properties.Ward || null,
        xCoord: feature.properties.X_Coord?.toString() || null,
        yCoord: feature.properties.Y_Coord?.toString() || null,
        source: feature.properties.Source || "Ministry of Education, 2016",
      }));

      try {
        await db.insert(schools).values(schoolData);
        totalImported += batch.length;

        const progress = Math.round((totalImported / geoData.features.length) * 100);
        console.log(`⏳ Progress: ${progress}% (${totalImported}/${geoData.features.length} schools)`);
      } catch (error: any) {
        console.error(`❌ Error seeding batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      }
    }

    console.log("\n📊 Seeding Summary:");
    console.log(`   Total schools in file: ${geoData.features.length}`);
    console.log(`   Successfully seeded: ${totalImported}`);
    console.log(`   Errors: ${errors}`);
    console.log("\n✅ Schools seeded successfully from Kenya Ministry of Education data!");

  } catch (error: any) {
    console.error("❌ Fatal error during schools seeding:", error.message);
    throw error;
  }
}
