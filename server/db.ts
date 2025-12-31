import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./db/schema/index.ts";

// Create MySQL connection
// Support both DATABASE_URL (Railway) and individual credentials (local dev)
let connection;

if (process.env.DATABASE_URL) {
  // Railway or other cloud providers typically provide DATABASE_URL
  connection = await mysql.createConnection(process.env.DATABASE_URL);
} else {
  // Local development with individual credentials
  connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "kitabu_connect",
  });
}

export const db = drizzle(connection, { schema, mode: "default" });
