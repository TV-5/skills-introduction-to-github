import crypto from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.ADMIN_PASSWORD && isProduction) {
  throw new Error("ADMIN_PASSWORD must be set in production");
}
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
if (!process.env.ADMIN_PASSWORD) {
  console.warn("[admin-auth] ADMIN_PASSWORD not set - using default 'admin'. Set it before deploying.");
}

export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn("[admin-auth] SESSION_SECRET not set - generated a random one for this run (sessions won't survive a restart).");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest();
}

export function passwordMatches(candidate) {
  if (typeof candidate !== "string") return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(ADMIN_PASSWORD));
}

// Simple in-memory brute-force guard: lock out an IP for a minute after 5 bad attempts.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const attemptsByIp = new Map();

export function isLockedOut(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  if (entry.count < MAX_ATTEMPTS) return false;
  if (Date.now() - entry.lastAttempt > LOCKOUT_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return true;
}

export function recordAttempt(ip, success) {
  if (success) {
    attemptsByIp.delete(ip);
    return;
  }
  const entry = attemptsByIp.get(ip) ?? { count: 0, lastAttempt: 0 };
  entry.count += 1;
  entry.lastAttempt = Date.now();
  attemptsByIp.set(ip, entry);
}

export function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: "admin authentication required" });
}
