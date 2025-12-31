/**
 * Realistic Data Seeder for Kitabu-Connect
 *
 * Simulates 2000+ real users with:
 * - Geographic distribution around Kenyan schools
 * - Realistic family structures (1-4+ children)
 * - 5000+ book listings (CBC & 8-4-4 curriculum)
 * - Swap requests and favorites
 * - Realistic pricing and engagement patterns
 */

import { db } from "../server/db";
import { users, children, bookListings, schools, swapRequests, favorites } from "../server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Kenyan-specific data
const KENYAN_FIRST_NAMES = [
  "Wanjiku", "Kamau", "Njeri", "Mwangi", "Akinyi", "Omondi", "Wambui", "Kipchoge",
  "Nyambura", "Kariuki", "Adhiambo", "Otieno", "Mumbi", "Kimani", "Awuor", "Ochieng",
  "Njoki", "Ndung'u", "Akoth", "Kiprono", "Wangari", "Githinji", "Akeyo", "Mutua",
  "Grace", "John", "Mary", "David", "Faith", "Peter", "Jane", "James",
  "Lucy", "Daniel", "Sarah", "Michael", "Ruth", "Joseph", "Elizabeth", "Samuel"
];

const KENYAN_LAST_NAMES = [
  "Kamau", "Ochieng", "Kipchoge", "Wanjiru", "Otieno", "Mutua", "Kimani", "Mwangi",
  "Njoroge", "Omondi", "Kariuki", "Ndung'u", "Githinji", "Akinyi", "Wambui", "Nyambura",
  "Kiprono", "Adhiambo", "Awuor", "Akeyo", "Akoth", "Njeri", "Njoki", "Mumbi"
];

const CHILD_NAMES = [
  "Brian", "Kevin", "Ian", "Ryan", "Kelvin", "Dennis", "Eric", "Victor",
  "Sharon", "Mercy", "Joy", "Esther", "Eunice", "Christine", "Beatrice", "Ivy",
  "Ethan", "Liam", "Noah", "Emma", "Olivia", "Sophia", "Amara", "Amani"
];

// Realistic Kenyan curriculum books
const CBC_BOOKS = [
  // Grade 1-3
  { title: "Literacy Activities Grade 1", subject: "English", publisher: "Longhorn", grades: ["Grade 1"] },
  { title: "Mathematics Activities Grade 1", subject: "Mathematics", publisher: "KLB", grades: ["Grade 1"] },
  { title: "Environmental Activities Grade 1", subject: "Science", publisher: "Longhorn", grades: ["Grade 1"] },
  { title: "Kiswahili Masomo Grade 1", subject: "Kiswahili", publisher: "KLB", grades: ["Grade 1"] },

  { title: "English Activities Grade 2", subject: "English", publisher: "Oxford", grades: ["Grade 2"] },
  { title: "Mathematics Activities Grade 2", subject: "Mathematics", publisher: "Longhorn", grades: ["Grade 2"] },
  { title: "Science Activities Grade 2", subject: "Science", publisher: "KLB", grades: ["Grade 2"] },

  { title: "English Activities Grade 3", subject: "English", publisher: "KLB", grades: ["Grade 3"] },
  { title: "Mathematics Activities Grade 3", subject: "Mathematics", publisher: "Oxford", grades: ["Grade 3"] },
  { title: "Integrated Science Grade 3", subject: "Science", publisher: "Longhorn", grades: ["Grade 3"] },

  // Grade 4-6
  { title: "English Activities Grade 4", subject: "English", publisher: "Longhorn", grades: ["Grade 4"] },
  { title: "Mathematics Grade 4", subject: "Mathematics", publisher: "KLB", grades: ["Grade 4"] },
  { title: "Science & Technology Grade 4", subject: "Science", publisher: "Oxford", grades: ["Grade 4"] },
  { title: "Social Studies Grade 4", subject: "Social Studies", publisher: "KLB", grades: ["Grade 4"] },

  { title: "English Grade 5", subject: "English", publisher: "Oxford", grades: ["Grade 5"] },
  { title: "Mathematics Grade 5", subject: "Mathematics", publisher: "Longhorn", grades: ["Grade 5"] },
  { title: "Integrated Science Grade 5", subject: "Science", publisher: "KLB", grades: ["Grade 5"] },
  { title: "Social Studies Grade 5", subject: "Social Studies", publisher: "Oxford", grades: ["Grade 5"] },

  { title: "English Activities Grade 6", subject: "English", publisher: "KLB", grades: ["Grade 6"] },
  { title: "Mathematics Grade 6", subject: "Mathematics", publisher: "Oxford", grades: ["Grade 6"] },
  { title: "Science Activities Grade 6", subject: "Science", publisher: "Longhorn", grades: ["Grade 6"] },
  { title: "Social Studies Grade 6", subject: "Social Studies", publisher: "KLB", grades: ["Grade 6"] },
];

const EIGHT_FOUR_FOUR_BOOKS = [
  // Form 1
  { title: "English Grammar Form 1", subject: "English", publisher: "Oxford", grades: ["Form 1"] },
  { title: "Mathematics Form 1", subject: "Mathematics", publisher: "KLB", grades: ["Form 1"] },
  { title: "Physics Form 1", subject: "Physics", publisher: "Oxford", grades: ["Form 1"] },
  { title: "Chemistry Form 1", subject: "Chemistry", publisher: "KLB", grades: ["Form 1"] },
  { title: "Biology Form 1", subject: "Biology", publisher: "Longhorn", grades: ["Form 1"] },
  { title: "Geography Form 1", subject: "Geography", publisher: "KLB", grades: ["Form 1"] },
  { title: "History Form 1", subject: "History", publisher: "Oxford", grades: ["Form 1"] },
  { title: "Kiswahili Fasili Form 1", subject: "Kiswahili", publisher: "KLB", grades: ["Form 1"] },

  // Form 2
  { title: "English Form 2", subject: "English", publisher: "Longhorn", grades: ["Form 2"] },
  { title: "Mathematics Form 2", subject: "Mathematics", publisher: "Oxford", grades: ["Form 2"] },
  { title: "Physics Form 2", subject: "Physics", publisher: "KLB", grades: ["Form 2"] },
  { title: "Chemistry Form 2", subject: "Chemistry", publisher: "Oxford", grades: ["Form 2"] },
  { title: "Biology Form 2", subject: "Biology", publisher: "KLB", grades: ["Form 2"] },
  { title: "Business Studies Form 2", subject: "Business Studies", publisher: "Oxford", grades: ["Form 2"] },

  // Form 3
  { title: "English Form 3", subject: "English", publisher: "KLB", grades: ["Form 3"] },
  { title: "Mathematics Form 3", subject: "Mathematics", publisher: "Longhorn", grades: ["Form 3"] },
  { title: "Physics Form 3", subject: "Physics", publisher: "Oxford", grades: ["Form 3"] },
  { title: "Chemistry Form 3", subject: "Chemistry", publisher: "KLB", grades: ["Form 3"] },
  { title: "Biology Form 3", subject: "Biology", publisher: "Oxford", grades: ["Form 3"] },

  // Form 4
  { title: "English Form 4", subject: "English", publisher: "Oxford", grades: ["Form 4"] },
  { title: "Mathematics Form 4", subject: "Mathematics", publisher: "KLB", grades: ["Form 4"] },
  { title: "Physics Form 4", subject: "Physics", publisher: "Longhorn", grades: ["Form 4"] },
  { title: "Chemistry Form 4", subject: "Chemistry", publisher: "Oxford", grades: ["Form 4"] },
  { title: "Biology Form 4", subject: "Biology", publisher: "KLB", grades: ["Form 4"] },
];

const ALL_BOOKS = [...CBC_BOOKS, ...EIGHT_FOUR_FOUR_BOOKS];

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
  "Form 1", "Form 2", "Form 3", "Form 4"
];

const CONDITIONS = ["Like New", "Good", "Fair", "Acceptable"];

// Helper functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomBool(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

function generatePhoneNumber(): string {
  const prefixes = ["0701", "0702", "0703", "0704", "0705", "0710", "0711", "0712", "0720", "0722", "0723", "0724", "0725", "0726", "0727", "0728", "0729", "0740", "0741", "0742", "0743", "0745", "0746", "0748", "0750", "0751", "0752", "0753", "0754", "0755", "0756", "0757", "0758", "0759", "0768", "0769", "0770", "0771", "0772", "0773", "0774", "0775", "0776", "0777", "0778", "0779", "0790", "0791", "0792", "0793", "0794", "0795", "0796", "0797", "0798", "0799"];
  const prefix = randomElement(prefixes);
  const suffix = String(randomInt(100000, 999999));
  return prefix + suffix;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(1, 99)}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
  ];
  return `${randomElement(variations)}@${randomElement(domains)}`;
}

// Generate coordinates near a school (within ~5-10km radius)
function generateNearbyCoordinates(schoolLat: number, schoolLng: number) {
  const radiusInDegrees = 0.09; // ~10km
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return {
    lat: schoolLat + x,
    lng: schoolLng + y
  };
}

// Determine curriculum based on grade
function getCurriculumForGrade(grade: string): "CBC" | "8-4-4" {
  return grade.startsWith("Form") ? "8-4-4" : "CBC";
}

// Get appropriate books for a grade
function getBooksForGrade(grade: string) {
  const curriculum = getCurriculumForGrade(grade);
  const bookPool = curriculum === "CBC" ? CBC_BOOKS : EIGHT_FOUR_FOUR_BOOKS;
  return bookPool.filter(book => book.grades.includes(grade));
}

// Generate realistic price based on condition
function generatePrice(condition: string, basePrice: number): number {
  const multipliers = {
    "Like New": 0.8,
    "Good": 0.6,
    "Fair": 0.4,
    "Acceptable": 0.25
  };

  const price = basePrice * multipliers[condition as keyof typeof multipliers];
  // Add some randomness (+/- 15%)
  const variance = price * 0.15;
  return Math.round((price + randomFloat(-variance, variance)) / 10) * 10; // Round to nearest 10
}

async function main() {
  console.log("🌱 Starting realistic data seeding...\n");

  // Create platform account first
  console.log("🏢 Creating platform account...");
  const PLATFORM_USER_ID = "56f3a7d4-8e21-4b1a-9c65-2f8471e039b2";
  const PLATFORM_EMAIL = "platform@kitabuconnect.com";

  // Check if platform account already exists
  const [existingPlatform] = await db
    .select()
    .from(users)
    .where(eq(users.email, PLATFORM_EMAIL))
    .limit(1);

  if (existingPlatform) {
    console.log(`✅ Platform account already exists (${PLATFORM_EMAIL})\n`);
  } else {
    try {
      await db.insert(users).values({
        id: PLATFORM_USER_ID,
        email: PLATFORM_EMAIL,
        fullName: "Kitabu Connect Platform",
        phoneNumber: "+254700000000",
        role: "admin",
        walletBalance: "0.00",
        onboardingCompleted: true,
      });
      console.log(`✅ Created platform account (${PLATFORM_EMAIL})\n`);
    } catch (error) {
      console.log(`⚠️  Platform account creation failed (may already exist): ${error}\n`);
    }
  }

  // Fetch all schools
  console.log("📚 Fetching schools from database...");
  const allSchools = await db.select().from(schools);
  console.log(`✅ Found ${allSchools.length} schools\n`);

  if (allSchools.length === 0) {
    console.error("❌ No schools found! Please seed schools first.");
    process.exit(1);
  }

  // Family size distribution
  const familySizeDistribution = [
    { size: 1, weight: 40 },
    { size: 2, weight: 35 },
    { size: 3, weight: 15 },
    { size: 4, weight: 7 },
    { size: 5, weight: 3 }
  ];

  const TARGET_USERS = 2000;
  const createdUsers: any[] = [];
  const createdChildren: any[] = [];

  console.log(`👥 Creating ${TARGET_USERS} users with families...\n`);

  for (let i = 0; i < TARGET_USERS; i++) {
    const firstName = randomElement(KENYAN_FIRST_NAMES);
    const lastName = randomElement(KENYAN_LAST_NAMES);
    const phoneNumber = generatePhoneNumber();
    const email = generateEmail(firstName, lastName);

    // Determine number of children
    const random = randomInt(1, 100);
    let childrenCount = 1;
    let cumulativeWeight = 0;

    for (const dist of familySizeDistribution) {
      cumulativeWeight += dist.weight;
      if (random <= cumulativeWeight) {
        childrenCount = dist.size;
        break;
      }
    }

    // Select a primary school for the family
    const primarySchool = randomElement(allSchools);
    const schoolLat = primarySchool.yCoord ? Number(primarySchool.yCoord) : -1.2921;
    const schoolLng = primarySchool.xCoord ? Number(primarySchool.xCoord) : 36.8219;

    // Generate user location near their school
    const userLocation = generateNearbyCoordinates(schoolLat, schoolLng);

    const userId = crypto.randomUUID();

    // Create user
    await db.insert(users).values({
      id: userId,
      phoneNumber,
      fullName: `${firstName} ${lastName}`,
      email,
      role: "PARENT",
      latitude: userLocation.lat.toFixed(7),
      longitude: userLocation.lng.toFixed(7),
      onboardingCompleted: true,
      verified: true,
      walletBalance: "0.00",
    });

    createdUsers.push({ id: userId, firstName, lastName, email });

    // Create children for this user
    for (let j = 0; j < childrenCount; j++) {
      const childName = randomElement(CHILD_NAMES);
      const grade = randomElement(GRADES);

      // 70% chance same school as siblings, 30% different school
      const childSchool = (j > 0 && randomBool(0.7))
        ? createdChildren[createdChildren.length - 1].schoolId
        : randomElement(allSchools).id;

      const schoolInfo = allSchools.find(s => s.id === childSchool);

      const [child] = await db.insert(children).values({
        parentId: userId,
        name: childName,
        grade,
        schoolId: childSchool,
        schoolName: schoolInfo?.schoolName || null,
        displayOrder: j,
      });

      createdChildren.push({
        id: child.insertId,
        parentId: userId,
        name: childName,
        grade,
        schoolId: childSchool,
        schoolName: schoolInfo?.schoolName
      });
    }

    if ((i + 1) % 100 === 0) {
      console.log(`✅ Created ${i + 1}/${TARGET_USERS} users...`);
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} users with ${createdChildren.length} children\n`);

  // Create book listings
  console.log("📚 Creating book listings...\n");

  const TARGET_LISTINGS = 5000;
  const createdListings: any[] = [];

  for (let i = 0; i < TARGET_LISTINGS; i++) {
    // Select random child to list book for
    const child = randomElement(createdChildren);
    const user = createdUsers.find(u => u.id === child.parentId);

    // Get appropriate books for this child's grade
    const gradeBooks = getBooksForGrade(child.grade);
    if (gradeBooks.length === 0) continue;

    const book = randomElement(gradeBooks);
    const condition = randomElement(CONDITIONS);
    const curriculum = getCurriculumForGrade(child.grade);

    // Base prices by subject
    const basePrices: Record<string, number> = {
      "Mathematics": 800,
      "English": 700,
      "Science": 750,
      "Physics": 850,
      "Chemistry": 850,
      "Biology": 850,
      "Geography": 700,
      "History": 700,
      "Kiswahili": 650,
      "Social Studies": 600,
      "Business Studies": 700,
    };

    const basePrice = basePrices[book.subject] || 600;
    const price = generatePrice(condition, basePrice);

    // 60% sell, 40% swap
    const listingType = randomBool(0.6) ? "sell" : "swap";

    // For swap listings, specify what they want
    const willingToSwapFor = listingType === "swap"
      ? `${randomElement(gradeBooks).title} or similar ${child.grade} books`
      : null;

    const [listing] = await db.insert(bookListings).values({
      sellerId: user!.id,
      title: book.title,
      author: book.publisher,
      publisher: book.publisher,
      subject: book.subject,
      classGrade: child.grade,
      curriculum,
      condition,
      price: listingType === "swap" ? "0.00" : price.toString(),
      originalRetailPrice: basePrice.toString(),
      negotiable: randomBool(0.7), // 70% negotiable
      listingType,
      willingToSwapFor,
      quantityAvailable: randomInt(1, 3),
      listingStatus: "active",
      description: `${condition} condition ${book.title} for ${child.grade}. Used for ${randomInt(1, 3)} ${randomInt(1, 3) === 1 ? "term" : "terms"}.`,
      viewsCount: randomInt(0, 50),
      favoritesCount: randomInt(0, 15),
    });

    createdListings.push({
      id: listing.insertId,
      sellerId: user!.id,
      title: book.title,
      listingType,
      grade: child.grade
    });

    if ((i + 1) % 250 === 0) {
      console.log(`✅ Created ${i + 1}/${TARGET_LISTINGS} listings...`);
    }
  }

  console.log(`\n✅ Created ${createdListings.length} book listings\n`);

  // Create some swap requests
  console.log("🔄 Creating swap requests...\n");

  const swapListings = createdListings.filter(l => l.listingType === "swap");
  const NUM_SWAP_REQUESTS = Math.min(200, Math.floor(swapListings.length * 0.3));

  for (let i = 0; i < NUM_SWAP_REQUESTS; i++) {
    const listing = randomElement(swapListings);
    const requester = randomElement(createdUsers.filter(u => u.id !== listing.sellerId));

    // Find requester's books
    const requesterListings = createdListings.filter(
      l => l.sellerId === requester.id && l.listingType === "swap"
    );

    if (requesterListings.length === 0) continue;

    const offeredBook = randomElement(requesterListings);

    await db.insert(swapRequests).values({
      requesterId: requester.id,
      ownerId: listing.sellerId,
      requestedListingId: listing.id,
      offeredListingId: offeredBook.id,
      status: randomElement(["pending", "pending", "pending", "accepted", "rejected"]),
      message: `Hi! I'd like to swap my ${offeredBook.title} for your ${listing.title}.`,
    });
  }

  console.log(`✅ Created ${NUM_SWAP_REQUESTS} swap requests\n`);

  // Create favorites
  console.log("❤️  Creating favorites...\n");

  const NUM_FAVORITES = 1000;

  for (let i = 0; i < NUM_FAVORITES; i++) {
    const user = randomElement(createdUsers);
    const listing = randomElement(createdListings.filter(l => l.sellerId !== user.id));

    try {
      await db.insert(favorites).values({
        userId: user.id,
        listingId: listing.id,
      });
    } catch (error) {
      // Ignore duplicate favorites
    }
  }

  console.log(`✅ Created up to ${NUM_FAVORITES} favorites\n`);

  console.log("🎉 Seeding completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`   - ${createdUsers.length} users`);
  console.log(`   - ${createdChildren.length} children`);
  console.log(`   - ${createdListings.length} book listings`);
  console.log(`   - ${NUM_SWAP_REQUESTS} swap requests`);
  console.log(`   - Up to ${NUM_FAVORITES} favorites\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
