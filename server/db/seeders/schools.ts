import { db } from "../../db.ts";
import { schools } from "../schema/index.ts";
import { randomUUID } from "crypto";

export async function seedSchools() {
  await db.insert(schools).values([
    // Thika Schools
    {
      id: randomUUID(),
      name: "Thika High School",
      location: "Thika Town, Kiambu County",
      latitude: "-1.0332",
      longitude: "37.0690",
    },
    {
      id: randomUUID(),
      name: "Thika Primary School",
      location: "Thika Town, Kiambu County",
      latitude: "-1.0369",
      longitude: "37.0693",
    },
    {
      id: randomUUID(),
      name: "Mangu High School",
      location: "Thika, Kiambu County",
      latitude: "-1.0225",
      longitude: "37.0845",
    },
    {
      id: randomUUID(),
      name: "St. Mary's Girls High School Thika",
      location: "Thika, Kiambu County",
      latitude: "-1.0415",
      longitude: "37.0732",
    },
    {
      id: randomUUID(),
      name: "Kiandutu Primary School",
      location: "Kiandutu, Thika",
      latitude: "-1.0485",
      longitude: "37.0658",
    },
    {
      id: randomUUID(),
      name: "Del Monte Kenya Primary School",
      location: "Thika, Kiambu County",
      latitude: "-1.0156",
      longitude: "37.0512",
    },
    {
      id: randomUUID(),
      name: "Gatuanyaga Primary School",
      location: "Gatuanyaga, Thika",
      latitude: "-1.0542",
      longitude: "37.0895",
    },
    {
      id: randomUUID(),
      name: "Highway Secondary School",
      location: "Thika, Kiambu County",
      latitude: "-1.0298",
      longitude: "37.0745",
    },
    {
      id: randomUUID(),
      name: "Blue Valley Academy",
      location: "Thika, Kiambu County",
      latitude: "-1.0445",
      longitude: "37.0712",
    },
    {
      id: randomUUID(),
      name: "Kenyatta Academy",
      location: "Thika Town, Kiambu County",
      latitude: "-1.0385",
      longitude: "37.0668",
    },

    // Muranga Schools
    {
      id: randomUUID(),
      name: "Murang'a High School",
      location: "Murang'a Town, Murang'a County",
      latitude: "-0.7210",
      longitude: "37.1526",
    },
    {
      id: randomUUID(),
      name: "Kagumo High School",
      location: "Kagumo, Murang'a County",
      latitude: "-0.7845",
      longitude: "37.1235",
    },
    {
      id: randomUUID(),
      name: "Bishop Gatimu Ngandu Girls High School",
      location: "Murang'a Town, Murang'a County",
      latitude: "-0.7165",
      longitude: "37.1498",
    },
    {
      id: randomUUID(),
      name: "Muthithi Primary School",
      location: "Muthithi, Murang'a County",
      latitude: "-0.7325",
      longitude: "37.1612",
    },
    {
      id: randomUUID(),
      name: "Karuri Girls High School",
      location: "Karuri, Murang'a County",
      latitude: "-0.6985",
      longitude: "37.1345",
    },
    {
      id: randomUUID(),
      name: "Kenol Academy",
      location: "Kenol, Murang'a County",
      latitude: "-0.8542",
      longitude: "37.1156",
    },
    {
      id: randomUUID(),
      name: "Mwirua Primary School",
      location: "Mwirua, Murang'a County",
      latitude: "-0.7458",
      longitude: "37.1685",
    },
    {
      id: randomUUID(),
      name: "Mugoiri Secondary School",
      location: "Mugoiri, Murang'a County",
      latitude: "-0.6825",
      longitude: "37.1425",
    },
    {
      id: randomUUID(),
      name: "Kandara Girls High School",
      location: "Kandara, Murang'a County",
      latitude: "-0.7912",
      longitude: "37.0245",
    },
    {
      id: randomUUID(),
      name: "Kiru Boys High School",
      location: "Kiru, Murang'a County",
      latitude: "-0.6548",
      longitude: "37.1785",
    },
    {
      id: randomUUID(),
      name: "Makuyu Primary School",
      location: "Makuyu, Murang'a County",
      latitude: "-0.7685",
      longitude: "37.1845",
    },
    {
      id: randomUUID(),
      name: "Ichagaki Secondary School",
      location: "Ichagaki, Murang'a County",
      latitude: "-0.7125",
      longitude: "37.1298",
    },
    {
      id: randomUUID(),
      name: "Gaichanjiru Primary School",
      location: "Gaichanjiru, Murang'a County",
      latitude: "-0.7398",
      longitude: "37.1542",
    },
    {
      id: randomUUID(),
      name: "Nginda Girls Secondary School",
      location: "Nginda, Murang'a County",
      latitude: "-0.7542",
      longitude: "37.1685",
    },
    {
      id: randomUUID(),
      name: "Mugoiri Girls High School",
      location: "Mugoiri, Murang'a County",
      latitude: "-0.6845",
      longitude: "37.1412",
    },
  ]);

  console.log("✅ Schools seeded successfully");
}
