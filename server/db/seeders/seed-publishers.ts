/**
 * Seed script for Kenyan book publishers
 *
 * This script populates the publishers table with major book publishers
 * operating in Kenya, including local and international publishers
 * that produce educational materials for the Kenyan market.
 */

import { db } from "../../db";
import { publishers } from "../schema";
import { eq } from "drizzle-orm";

interface PublisherData {
  name: string;
  country: string;
  websiteUrl?: string;
}

const kenyanPublishers: PublisherData[] = [
  // Major Kenyan Publishers
  {
    name: "Longhorn Publishers",
    country: "Kenya",
    websiteUrl: "https://longhornpublishers.com"
  },
  {
    name: "Oxford University Press East Africa",
    country: "Kenya",
    websiteUrl: "https://oup.co.ke"
  },
  {
    name: "East African Educational Publishers (EAEP)",
    country: "Kenya",
    websiteUrl: "https://eastafricanpublishers.com"
  },
  {
    name: "Jomo Kenyatta Foundation (JKF)",
    country: "Kenya",
    websiteUrl: "https://jkf.co.ke"
  },
  {
    name: "Kenya Literature Bureau (KLB)",
    country: "Kenya",
    websiteUrl: "https://klb.co.ke"
  },
  {
    name: "Moran Publishers",
    country: "Kenya",
    websiteUrl: "https://moranpublishers.com"
  },
  {
    name: "Mountain Top Publishers",
    country: "Kenya",
    websiteUrl: "https://mountaintoppublishers.co.ke"
  },
  {
    name: "Spotlight Publishers",
    country: "Kenya",
    websiteUrl: "https://spotlightpublishers.co.ke"
  },
  {
    name: "Sasa Publishers",
    country: "Kenya",
    websiteUrl: "https://sasapublishers.com"
  },
  {
    name: "Mentor Publishers",
    country: "Kenya",
    websiteUrl: "https://mentorpublishers.co.ke"
  },
  {
    name: "Queenex Publishers",
    country: "Kenya",
    websiteUrl: "https://queenexpublishers.com"
  },
  {
    name: "Adili Publishers",
    country: "Kenya",
    websiteUrl: "https://adilipublishers.co.ke"
  },
  {
    name: "All Saints Publishers",
    country: "Kenya",
    websiteUrl: "https://allsaintspublishers.co.ke"
  },
  {
    name: "Ecolebooks Publishers",
    country: "Kenya",
    websiteUrl: "https://ecolebooks.co.ke"
  },
  {
    name: "Focus Publishers",
    country: "Kenya",
    websiteUrl: "https://focuspublishers.co.ke"
  },
  {
    name: "Storymoja Publishers",
    country: "Kenya",
    websiteUrl: "https://storymojaafrica.co.ke"
  },
  {
    name: "Smartline Publishers",
    country: "Kenya",
    websiteUrl: "https://smartlinepublishers.co.ke"
  },
  {
    name: "Starbright Publishers",
    country: "Kenya",
    websiteUrl: "https://starbrightpublishers.co.ke"
  },
  {
    name: "Phoenix Publishers",
    country: "Kenya",
    websiteUrl: "https://phoenixpublishers.co.ke"
  },
  {
    name: "Acacia Publishers",
    country: "Kenya",
    websiteUrl: "https://acaciapublishers.com"
  },
  {
    name: "Tarcher Publishers",
    country: "Kenya",
    websiteUrl: "https://tarcherpublishers.com"
  },
  {
    name: "Zuvic Publishers",
    country: "Kenya",
    websiteUrl: "https://zuvicpublishers.com"
  },
  {
    name: "Kenya Education Development Association (KEDA)",
    country: "Kenya",
    websiteUrl: "https://keda.co.ke"
  },
  {
    name: "Hodder Education East Africa",
    country: "Kenya",
    websiteUrl: "https://hoddereducation.co.ke"
  },
  {
    name: "One Planet Publishers",
    country: "Kenya",
    websiteUrl: "https://oneplanetpublishers.com"
  },

  // International Publishers Operating in Kenya
  {
    name: "Macmillan Publishers",
    country: "United Kingdom",
    websiteUrl: "https://macmillan.com"
  },
  {
    name: "Cambridge University Press",
    country: "United Kingdom",
    websiteUrl: "https://cambridge.org"
  },
  {
    name: "Pearson Education",
    country: "United Kingdom",
    websiteUrl: "https://pearson.com"
  },
  {
    name: "Nelson Thornes Publishers",
    country: "United Kingdom",
    websiteUrl: "https://nelsonthornes.com"
  },
  {
    name: "Collins Publishers",
    country: "United Kingdom",
    websiteUrl: "https://collins.co.uk"
  },
  {
    name: "Heinemann Publishers",
    country: "United Kingdom",
    websiteUrl: "https://heinemann.com"
  },
  {
    name: "McGraw-Hill Education",
    country: "United States",
    websiteUrl: "https://mheducation.com"
  },

  // East African Regional Publishers
  {
    name: "Fountain Publishers",
    country: "Uganda",
    websiteUrl: "https://fountainpublishers.co.ug"
  },
  {
    name: "Mkuki na Nyota Publishers",
    country: "Tanzania",
    websiteUrl: "https://mkukinanyota.com"
  },
  {
    name: "Macmillan East Africa",
    country: "Kenya",
    websiteUrl: "https://macmillan.co.ke"
  },

  // Additional Kenyan Publishers
  {
    name: "Bookmark Africa",
    country: "Kenya",
    websiteUrl: "https://bookmarkafrica.com"
  },
  {
    name: "Viva Africa Publishing",
    country: "Kenya",
    websiteUrl: "https://vivaafricapublishing.com"
  },
  {
    name: "Act Now Publishers",
    country: "Kenya",
    websiteUrl: "https://actnowpublishers.co.ke"
  },
  {
    name: "Benchmark Publishers",
    country: "Kenya",
    websiteUrl: "https://benchmarkpublishers.co.ke"
  },
  {
    name: "Briteline Publishers",
    country: "Kenya",
    websiteUrl: "https://britelinepublishers.com"
  },
  {
    name: "Capricorn Academic Publishers",
    country: "Kenya",
    websiteUrl: "https://capricornacademic.com"
  },
  {
    name: "DeltaWay Publishers",
    country: "Kenya",
    websiteUrl: "https://deltawaypublishers.com"
  },
  {
    name: "Emak Publishers",
    country: "Kenya",
    websiteUrl: "https://emakpublishers.com"
  },
  {
    name: "Friends Publishers",
    country: "Kenya",
    websiteUrl: "https://friendspublishers.co.ke"
  },
  {
    name: "Greenland Publishers",
    country: "Kenya",
    websiteUrl: "https://greenlandpublishers.com"
  },
  {
    name: "Heritage Publishers",
    country: "Kenya",
    websiteUrl: "https://heritagepublishers.co.ke"
  },
  {
    name: "Legacy Publishers",
    country: "Kenya",
    websiteUrl: "https://legacypublishers.co.ke"
  },
  {
    name: "Metropole Publishers",
    country: "Kenya",
    websiteUrl: "https://metropolepublishers.com"
  },
  {
    name: "Mwalimu Publishers",
    country: "Kenya",
    websiteUrl: "https://mwalimupublishers.com"
  },
  {
    name: "Olympus Publishers",
    country: "Kenya",
    websiteUrl: "https://olympuspublishers.co.ke"
  },
  {
    name: "Peak Publishers",
    country: "Kenya",
    websiteUrl: "https://peakpublishers.co.ke"
  },
  {
    name: "Richmount Publishers",
    country: "Kenya",
    websiteUrl: "https://richmountpublishers.com"
  },
  {
    name: "Setphi Publishers",
    country: "Kenya",
    websiteUrl: "https://setphipublishers.com"
  },
  {
    name: "Sunland Publishers",
    country: "Kenya",
    websiteUrl: "https://sunlandpublishers.com"
  },
  {
    name: "TopMark Publishers",
    country: "Kenya",
    websiteUrl: "https://topmarkpublishers.co.ke"
  },
  {
    name: "Visionary Publishers",
    country: "Kenya",
    websiteUrl: "https://visionarypublishers.co.ke"
  },
];

async function seedPublishers() {
  console.log("🌱 Starting publishers seeding...");
  console.log(`📚 Total publishers to seed: ${kenyanPublishers.length}`);

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const publisher of kenyanPublishers) {
    try {
      // Check if publisher already exists
      const existing = await db
        .select()
        .from(publishers)
        .where(eq(publishers.name, publisher.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipped: ${publisher.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Insert publisher
      await db.insert(publishers).values({
        name: publisher.name,
        country: publisher.country,
        websiteUrl: publisher.websiteUrl || null,
      });

      console.log(`✅ Inserted: ${publisher.name} (${publisher.country})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting ${publisher.name}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 PUBLISHERS SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully inserted: ${insertedCount}`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📚 Total processed: ${kenyanPublishers.length}`);
  console.log("=".repeat(60) + "\n");

  if (insertedCount === 0 && skippedCount === kenyanPublishers.length) {
    console.log("✨ All publishers already seeded! Database is up to date.");
  } else if (insertedCount > 0) {
    console.log(`✨ Successfully seeded ${insertedCount} new publishers!`);
  }
}

// Run seeder
seedPublishers()
  .then(() => {
    console.log("🎉 Publishers seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error during publishers seeding:", error);
    process.exit(1);
  });
