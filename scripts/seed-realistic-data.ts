/**
 * Realistic Data Seeder for Kitabu-Connect (Launch Ready Version)
 */

import { db } from "../server/db";
import { users, children, bookListings, schools, swapRequests, favorites } from "../server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const KENYAN_FIRST_NAMES = ["Wanjiku", "Kamau", "Njeri", "Mwangi", "Akinyi", "Omondi", "Wambui", "Kipchoge", "Nyambura", "Kariuki", "Adhiambo", "Otieno", "Mumbi", "Kimani", "Awuor", "Ochieng", "Njoki", "Ndung'u", "Akoth", "Kiprono", "Wangari", "Githinji", "Akeyo", "Mutua", "Grace", "John", "Mary", "David", "Faith", "Peter", "Jane", "James", "Lucy", "Daniel", "Sarah", "Michael", "Ruth", "Joseph", "Elizabeth", "Samuel"];
const KENYAN_LAST_NAMES = ["Kamau", "Ochieng", "Kipchoge", "Wanjiru", "Otieno", "Mutua", "Kimani", "Mwangi", "Njoroge", "Omondi", "Kariuki", "Ndung'u", "Githinji", "Akinyi", "Wambui", "Nyambura", "Kiprono", "Adhiambo", "Awuor", "Akeyo", "Akoth", "Njeri", "Njoki", "Mumbi"];
const CHILD_NAMES = ["Brian", "Kevin", "Ian", "Ryan", "Kelvin", "Dennis", "Eric", "Victor", "Sharon", "Mercy", "Joy", "Esther", "Eunice", "Christine", "Beatrice", "Ivy", "Ethan", "Liam", "Noah", "Emma", "Olivia", "Sophia", "Amara", "Amani"];

const HUMAN_REMARKS = [
  "Well maintained, no marks inside.",
  "Cover is a bit worn but all pages are intact.",
  "Used for only one term last year.",
  "My son finished Grade 4 and doesn't need this anymore.",
  "Looking to swap for the next grade's books.",
  "Price is slightly negotiable if you pick up at the school gate.",
  "Clean copy, no dog-ears.",
  "Found it very helpful for revision.",
  "Upgrading to Form 2, selling my Form 1 set.",
  "Slightly used but in good condition."
];

const CBC_BOOKS = [
  { title: "Literacy Activities Grade 1", subject: "English", publisher: "Longhorn", grades: ["Grade 1"] },
  { title: "Mathematics Activities Grade 1", subject: "Mathematics", publisher: "KLB", grades: ["Grade 1"] },
  { title: "English Activities Grade 4", subject: "English", publisher: "Longhorn", grades: ["Grade 4"] },
  { title: "Science & Technology Grade 4", subject: "Science", publisher: "Oxford", grades: ["Grade 4"] },
  { title: "English Grade 5", subject: "English", publisher: "Oxford", grades: ["Grade 5"] },
  { title: "Mathematics Grade 6", subject: "Mathematics", publisher: "Oxford", grades: ["Grade 6"] },
];

const EIGHT_FOUR_FOUR_BOOKS = [
  { title: "English Grammar Form 1", subject: "English", publisher: "Oxford", grades: ["Form 1"] },
  { title: "Mathematics Form 1", subject: "Mathematics", publisher: "KLB", grades: ["Form 1"] },
  { title: "Physics Form 2", subject: "Physics", publisher: "KLB", grades: ["Form 2"] },
  { title: "Chemistry Form 3", subject: "Chemistry", publisher: "KLB", grades: ["Form 3"] },
  { title: "Biology Form 4", subject: "Biology", publisher: "KLB", grades: ["Form 4"] },
];

const GRADES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4"];
const CONDITIONS = ["Like New", "Good", "Fair", "Acceptable"];

// --- Helpers ---
function randomElement<T>(array: T[]): T { return array[Math.floor(Math.random() * array.length)]; }
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomBool(probability: number = 0.5): boolean { return Math.random() < probability; }

// Spreads activity over the last 30 days
function randomPastDate(daysBack: number): Date {
  const date = new Date();
  date.setSeconds(date.getSeconds() - randomInt(0, daysBack * 24 * 60 * 60));
  return date;
}

function generatePhoneNumber(): string {
  const prefixes = ["0701", "0711", "0722", "0745", "0790"];
  return randomElement(prefixes) + String(randomInt(100000, 999999));
}

async function main() {
  console.log("🚀 Starting Launch-Ready Data Seeding...");

  const allSchools = await db.select().from(schools);
  if (allSchools.length === 0) {
    console.error("❌ No schools found! Seed schools first.");
    process.exit(1);
  }

  const TARGET_USERS = 200;
  const createdUsers: any[] = [];
  const createdChildren: any[] = [];

  for (let i = 0; i < TARGET_USERS; i++) {
    const firstName = randomElement(KENYAN_FIRST_NAMES);
    const lastName = randomElement(KENYAN_LAST_NAMES);
    const userId = crypto.randomUUID();
    
    // PERSONA LOGIC: 10% Power Users, 70% Casual, 20% Lurkers
    const rand = Math.random();
    const userPersona = rand < 0.1 ? 'POWER' : (rand < 0.8 ? 'CASUAL' : 'LURKER');
    
    await db.insert(users).values({
      id: userId,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@example.com`,
      phoneNumber: generatePhoneNumber(),
      role: "PARENT",
      verified: randomBool(0.4), // 40% are "verified" users
      onboardingCompleted: true,
      createdAt: randomPastDate(30),
    });

    createdUsers.push({ id: userId, persona: userPersona });

    // Only non-lurkers have children and listings in this seeder
    if (userPersona !== 'LURKER') {
      const childCount = userPersona === 'POWER' ? randomInt(3, 5) : randomInt(1, 2);
      for (let j = 0; j < childCount; j++) {
        const grade = randomElement(GRADES);
        const [child] = await db.insert(children).values({
          parentId: userId,
          name: randomElement(CHILD_NAMES),
          grade,
          schoolId: randomElement(allSchools).id,
        });
        createdChildren.push({ id: child.insertId, parentId: userId, grade });
      }
    }
  }

  console.log(`✅ ${createdUsers.length} users created.`);

  // --- Book Listings ---
  const TARGET_LISTINGS = 800;
  const createdListings: any[] = [];

  for (let i = 0; i < TARGET_LISTINGS; i++) {
    const child = randomElement(createdChildren);
    const user = createdUsers.find(u => u.id === child.parentId);
    
    const bookPool = child.grade.startsWith("Form") ? EIGHT_FOUR_FOUR_BOOKS : CBC_BOOKS;
    const book = randomElement(bookPool);
    const condition = randomElement(CONDITIONS);
    
    // Status Logic: 15% items marked as SOLD to show the platform is moving
    const listingStatus = randomBool(0.15) ? "sold" : "active";
    const listingType = randomBool(0.7) ? "sell" : "swap";
    
    // Humanized description
    const description = `${randomElement(HUMAN_REMARKS)} This is the ${book.publisher} edition for ${child.grade}.`;

    const [listing] = await db.insert(bookListings).values({
      sellerId: user.id,
      title: book.title,
      publisher: book.publisher,
      subject: book.subject,
      classGrade: child.grade,
      condition,
      price: listingType === "swap" ? "0.00" : randomInt(300, 900).toString(),
      listingType,
      listingStatus,
      description,
      viewsCount: randomInt(5, 150),
      favoritesCount: randomInt(0, 20),
      createdAt: randomPastDate(20), // Listed in the last 20 days
    });

    createdListings.push({ id: listing.insertId, sellerId: user.id, listingType, title: book.title });
  }

  console.log(`✅ ${createdListings.length} listings (including 'Sold' items) created.`);
  process.exit(0);
}

main().catch(console.error);