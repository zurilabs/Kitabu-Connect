import { db } from "../../db.ts";
import { bookPhotos } from "../schema/index.ts";
import { bookListings } from "../schema/index.ts";

export async function seedBookPhotos() {
  const listings = await db.select().from(bookListings);

  await db.insert(bookPhotos).values([
    {
      listingId: listings[0].id,
      photoUrl: "https://example.com/book-cover.jpg",
      photoType: "cover",
      displayOrder: 1,
    },
    {
      listingId: listings[0].id,
      photoUrl: "https://example.com/book-pages.jpg",
      photoType: "pages",
      displayOrder: 2,
    },
  ]);
}
