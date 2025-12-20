import { db } from "../../db.ts";
import { bookListings, users } from "../schema/index.ts";

export async function seedBookListings() {
  // Get the first user to act as seller
  const [seller] = await db.select().from(users).limit(1);

  if (!seller) {
    throw new Error("No users found. Seed users first!");
  }

  await db.insert(bookListings).values([
    {
      sellerId: seller.id,
      title: "Mathematics Grade 4 Learner’s Book",
      isbn: "9789966578921",
      publisher: "Kenya Literature Bureau",
      author: "KLB",
      edition: "CBC",
      publicationYear: 2021,
      subject: "Mathematics",
      classGrade: "Grade 4",
      curriculum: "CBC",
      condition: "Good",
      price: "500.00", // safer as string for decimal fields
      description: "Used for one term, clean pages",
      quantityAvailable: 1,
      listingType: "sell",
      negotiable: true,
      language: "English",
      region: "Kenyan",
    },
    {
      sellerId: seller.id,
      title: "English Form 2 Course Book",
      isbn: "9780195712300",
      publisher: "Oxford University Press",
      author: "Oxford",
      edition: "8-4-4",
      publicationYear: 2020,
      subject: "English",
      classGrade: "Form 2",
      curriculum: "8-4-4",
      condition: "Like New",
      price: "900.00",
      quantityAvailable: 2,
      listingType: "sell",
      negotiable: true,
      language: "English",
      region: "Kenyan",
    },
  ]);
}
