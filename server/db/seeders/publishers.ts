import { db } from "../../db.ts";
import { publishers } from "../schema/index.ts";

export async function seedPublishers() {
  await db.insert(publishers).values([
    {
      name: "Kenya Literature Bureau",
      country: "Kenya",
      websiteUrl: "https://klb.co.ke",
    },
    {
      name: "Oxford University Press",
      country: "UK",
      websiteUrl: "https://www.oup.com",
    },
    {
      name: "Longhorn Publishers",
      country: "Kenya",
      websiteUrl: "https://longhornpublishers.com",
    },
  ]);
}
