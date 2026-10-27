import crypto from "crypto";
import { AuthSessionPayload } from "@/types/auth";

const AUTH_SECRET = process.env.AUTH_SECRET || "stratux-super-secret-auth-key-2026-production-secure";

/**
 * Hash a password using scrypt with a unique salt
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * Verify a password against stored hash and salt in constant time
 */
export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, storedSalt, 64);
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (testHash.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(testHash, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random token (e.g. for invitation or reset)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Base64URL encode string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Base64URL decode string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Create a signed session token
 */
export function createSessionToken(payload: Omit<AuthSessionPayload, "exp">, durationSeconds: number = 60 * 60 * 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + durationSeconds;
  const fullPayload: AuthSessionPayload = { ...payload, exp };
  
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${header}.${data}`;
  
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(signatureInput);
  const signature = base64UrlEncode(hmac.digest("base64"));
  
  return `${header}.${data}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): AuthSessionPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, data, signature] = parts;
    const signatureInput = `${header}.${data}`;
    
    const hmac = crypto.createHmac("sha256", AUTH_SECRET);
    hmac.update(signatureInput);
    const expectedSignature = base64UrlEncode(hmac.digest("base64"));
    
    // Constant time comparison
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(data)) as AuthSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    
    return payload;
  } catch {
    return null;
  }
}
