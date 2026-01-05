/**
 * Seed script for Kenya CBC Curriculum subjects
 *
 * This script populates the subjects table with all subjects from the
 * Competency-Based Curriculum (CBC) for:
 * - Lower Primary (Grade 1-3)
 * - Upper Primary (Grade 4-6)
 * - Junior Secondary (Grade 7-9 / JSS)
 * - Senior Secondary (Form 1-4 / Grade 10-12)
 *
 * Also includes 8-4-4 curriculum subjects for Form 1-4
 */

import { db } from "../../db";
import { subjects } from "../schema";
import { eq } from "drizzle-orm";

interface SubjectData {
  name: string;
  description: string;
  sortOrder: number;
}

// CBC Curriculum Subjects organized by learning area
const cbcSubjects: SubjectData[] = [
  // ===================================
  // LOWER PRIMARY (Grade 1-3)
  // ===================================

  // Languages
  {
    name: "English",
    description: "English Language - Reading, Writing, Speaking, and Listening skills for all grades",
    sortOrder: 1
  },
  {
    name: "Kiswahili",
    description: "Kiswahili Language - Kusoma, Kuandika, Kuzungumza na Kusikiliza for all grades",
    sortOrder: 2
  },
  {
    name: "Kenyan Sign Language (KSL)",
    description: "Kenyan Sign Language for learners with hearing impairment",
    sortOrder: 3
  },
  {
    name: "Indigenous Languages",
    description: "Mother tongue/local languages for cultural identity and communication",
    sortOrder: 4
  },
  {
    name: "Braille",
    description: "Braille literacy for learners with visual impairment",
    sortOrder: 5
  },

  // Mathematical Activities
  {
    name: "Mathematics",
    description: "Mathematical concepts, numeracy, problem-solving, and logical thinking for all grades",
    sortOrder: 10
  },
  {
    name: "Mathematical Activities",
    description: "Hands-on mathematical activities and problem solving (Lower Primary)",
    sortOrder: 11
  },

  // Environmental Activities
  {
    name: "Environmental Activities",
    description: "Integrated Science and Social Studies for Lower Primary (Grade 1-3)",
    sortOrder: 20
  },

  // Hygiene and Nutrition Activities
  {
    name: "Hygiene and Nutrition Activities",
    description: "Personal hygiene, nutrition, and health practices (Lower Primary)",
    sortOrder: 25
  },

  // Religious Education
  {
    name: "Christian Religious Education (CRE)",
    description: "Christian Religious Education - Biblical teachings and Christian values",
    sortOrder: 30
  },
  {
    name: "Islamic Religious Education (IRE)",
    description: "Islamic Religious Education - Islamic teachings and values",
    sortOrder: 31
  },
  {
    name: "Hindu Religious Education (HRE)",
    description: "Hindu Religious Education - Hindu teachings and values",
    sortOrder: 32
  },

  // Movement and Creative Activities
  {
    name: "Movement and Creative Activities",
    description: "Physical education, creative arts, music, and drama (Lower Primary)",
    sortOrder: 40
  },

  // ===================================
  // UPPER PRIMARY (Grade 4-6)
  // ===================================

  // Science and Technology
  {
    name: "Science and Technology",
    description: "Integrated Science and Technology for Upper Primary (Grade 4-6)",
    sortOrder: 50
  },
  {
    name: "Integrated Science",
    description: "Integrated Science covering Biology, Chemistry, and Physics concepts",
    sortOrder: 51
  },

  // Social Studies
  {
    name: "Social Studies",
    description: "Geography, History, Civics, and Current Affairs (Grade 4-6)",
    sortOrder: 60
  },

  // Pre-Technical and Pre-Career Education
  {
    name: "Pre-Technical and Pre-Career Education",
    description: "Introduction to technical skills and career awareness (Grade 4-6)",
    sortOrder: 70
  },

  // Creative Arts
  {
    name: "Creative Arts and Sports",
    description: "Visual arts, performing arts, and sports activities",
    sortOrder: 80
  },
  {
    name: "Creative Arts",
    description: "Art and Craft, Music, Drama, and Dance",
    sortOrder: 81
  },
  {
    name: "Art and Craft",
    description: "Visual arts, drawing, painting, and craft-making",
    sortOrder: 82
  },
  {
    name: "Music",
    description: "Music theory, singing, and instrumental skills",
    sortOrder: 83
  },
  {
    name: "Physical Education (PE)",
    description: "Physical fitness, sports, and health education",
    sortOrder: 84
  },
  {
    name: "Sports",
    description: "Sports activities and games for physical fitness",
    sortOrder: 85
  },

  // ===================================
  // JUNIOR SECONDARY SCHOOL (Grade 7-9)
  // ===================================

  // Languages (continued)
  {
    name: "English Language",
    description: "Advanced English Language skills for secondary level",
    sortOrder: 100
  },
  {
    name: "Kiswahili Language",
    description: "Advanced Kiswahili Language skills",
    sortOrder: 101
  },
  {
    name: "Foreign Languages",
    description: "French, German, Arabic, Mandarin, or other foreign languages",
    sortOrder: 102
  },
  {
    name: "French",
    description: "French language and culture",
    sortOrder: 103
  },
  {
    name: "German",
    description: "German language and culture",
    sortOrder: 104
  },
  {
    name: "Arabic",
    description: "Arabic language and Islamic culture",
    sortOrder: 105
  },

  // Mathematics (continued)
  {
    name: "Integrated Mathematics",
    description: "Comprehensive mathematics for junior secondary",
    sortOrder: 110
  },

  // Science Subjects
  {
    name: "Integrated Science (JSS)",
    description: "Integrated Science for Junior Secondary School (Grade 7-9)",
    sortOrder: 120
  },
  {
    name: "Biology",
    description: "Study of living organisms and life processes",
    sortOrder: 121
  },
  {
    name: "Chemistry",
    description: "Study of matter, its properties, and reactions",
    sortOrder: 122
  },
  {
    name: "Physics",
    description: "Study of matter, energy, and physical phenomena",
    sortOrder: 123
  },

  // Social Sciences
  {
    name: "Social Studies (JSS)",
    description: "Integrated social studies for junior secondary",
    sortOrder: 130
  },
  {
    name: "History and Government",
    description: "Historical events and governmental systems",
    sortOrder: 131
  },
  {
    name: "Geography",
    description: "Physical and human geography",
    sortOrder: 132
  },
  {
    name: "Citizenship Education",
    description: "Civic education and national values",
    sortOrder: 133
  },

  // Business Studies
  {
    name: "Business Studies",
    description: "Introduction to business, entrepreneurship, and economics",
    sortOrder: 140
  },

  // Agriculture
  {
    name: "Agriculture",
    description: "Crop production, animal husbandry, and agricultural practices",
    sortOrder: 150
  },

  // Life Skills Education
  {
    name: "Life Skills Education",
    description: "Personal development, decision-making, and life management",
    sortOrder: 160
  },

  // Home Science
  {
    name: "Home Science",
    description: "Food and nutrition, clothing, and home management",
    sortOrder: 170
  },

  // Computer Science
  {
    name: "Computer Science",
    description: "Computer literacy, programming, and digital skills",
    sortOrder: 180
  },
  {
    name: "Information and Communication Technology (ICT)",
    description: "ICT skills and digital literacy",
    sortOrder: 181
  },

  // Technology and Engineering
  {
    name: "Technology and Engineering",
    description: "Technical drawing, engineering concepts, and practical skills",
    sortOrder: 190
  },
  {
    name: "Woodwork",
    description: "Woodworking skills and carpentry",
    sortOrder: 191
  },
  {
    name: "Metalwork",
    description: "Metalworking and fabrication skills",
    sortOrder: 192
  },
  {
    name: "Power Mechanics",
    description: "Mechanical engineering and machine operations",
    sortOrder: 193
  },
  {
    name: "Electricity",
    description: "Electrical systems and electronics",
    sortOrder: 194
  },
  {
    name: "Building and Construction",
    description: "Construction techniques and building technology",
    sortOrder: 195
  },

  // ===================================
  // SENIOR SECONDARY / FORM 1-4 (8-4-4)
  // ===================================

  // Humanities
  {
    name: "History",
    description: "World history and Kenyan history",
    sortOrder: 200
  },
  {
    name: "Government",
    description: "Political systems and governance",
    sortOrder: 201
  },
  {
    name: "Economics",
    description: "Economic theory and principles",
    sortOrder: 210
  },
  {
    name: "Commerce",
    description: "Commercial activities and business transactions",
    sortOrder: 211
  },
  {
    name: "Accounting",
    description: "Financial accounting and bookkeeping",
    sortOrder: 212
  },

  // Languages (Form level)
  {
    name: "Literature",
    description: "English literature and literary analysis",
    sortOrder: 220
  },
  {
    name: "Fasihi",
    description: "Kiswahili literature and literary criticism",
    sortOrder: 221
  },

  // Technical Subjects
  {
    name: "Aviation Technology",
    description: "Aviation principles and aerospace technology",
    sortOrder: 230
  },
  {
    name: "Drawing and Design",
    description: "Technical drawing and design principles",
    sortOrder: 231
  },
  {
    name: "Food and Nutrition",
    description: "Nutrition science and food preparation",
    sortOrder: 240
  },
  {
    name: "Clothing and Textiles",
    description: "Textile science and garment construction",
    sortOrder: 241
  },

  // Additional Subjects
  {
    name: "General Science",
    description: "General scientific concepts and principles",
    sortOrder: 250
  },
  {
    name: "Environmental Science",
    description: "Environmental conservation and sustainability",
    sortOrder: 251
  },
  {
    name: "Computer Studies",
    description: "Computer applications and programming (8-4-4)",
    sortOrder: 260
  },

  // Arts
  {
    name: "Fine Art",
    description: "Advanced visual arts and artistic techniques",
    sortOrder: 270
  },
  {
    name: "Performing Arts",
    description: "Drama, theatre, and performance studies",
    sortOrder: 271
  },

  // Career and Technology
  {
    name: "Hospitality and Tourism",
    description: "Tourism industry and hospitality management",
    sortOrder: 280
  },
  {
    name: "Entrepreneurship",
    description: "Business creation and entrepreneurial skills",
    sortOrder: 290
  },

  // Special Subjects
  {
    name: "Guidance and Counselling",
    description: "Personal guidance and counseling support",
    sortOrder: 300
  },
  {
    name: "Career and Technology Studies",
    description: "Career exploration and technical skills",
    sortOrder: 301
  },
];

async function seedSubjects() {
  console.log("🌱 Starting CBC subjects seeding...");
  console.log(`📚 Total subjects to seed: ${cbcSubjects.length}`);

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const subject of cbcSubjects) {
    try {
      // Check if subject already exists
      const existing = await db
        .select()
        .from(subjects)
        .where(eq(subjects.name, subject.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipped: ${subject.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Insert subject
      await db.insert(subjects).values({
        name: subject.name,
        description: subject.description,
        sortOrder: subject.sortOrder,
        iconUrl: null,
      });

      console.log(`✅ Inserted: ${subject.name}`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting ${subject.name}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUBJECTS SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully inserted: ${insertedCount}`);
  console.log(`⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📚 Total processed: ${cbcSubjects.length}`);
  console.log("=".repeat(60));

  console.log("\n📋 SUBJECTS BY CATEGORY:");
  console.log("  • Core Languages: English, Kiswahili, Sign Language");
  console.log("  • Mathematics: Mathematics, Mathematical Activities");
  console.log("  • Sciences: Biology, Chemistry, Physics, Integrated Science");
  console.log("  • Social Studies: History, Geography, Government, Citizenship");
  console.log("  • Business: Business Studies, Commerce, Accounting, Economics");
  console.log("  • Technology: Computer Science, ICT, Engineering, Technical subjects");
  console.log("  • Arts: Creative Arts, Music, Fine Art, Performing Arts");
  console.log("  • Religious Education: CRE, IRE, HRE");
  console.log("  • Life Skills: Home Science, Agriculture, Life Skills Education");
  console.log("  • Physical Education: Sports, PE, Movement Activities");
  console.log("=".repeat(60) + "\n");

  if (insertedCount === 0 && skippedCount === cbcSubjects.length) {
    console.log("✨ All subjects already seeded! Database is up to date.");
  } else if (insertedCount > 0) {
    console.log(`✨ Successfully seeded ${insertedCount} new subjects!`);
  }
}

// Run seeder
seedSubjects()
  .then(() => {
    console.log("🎉 Subjects seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error during subjects seeding:", error);
    process.exit(1);
  });
