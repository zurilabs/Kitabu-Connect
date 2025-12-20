import { SignJWT, jwtVerify } from "jose";
import type { User } from "server/db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "kitabu-secret-change-in-production";
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  role: string;
}

export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
