import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_DAYS = 7;

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId, typ: "a" }, env.jwtAccessSecret, { expiresIn: ACCESS_TTL_S });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as { sub: string; typ: string; exp: number; iat: number };
}

export function createRefreshTokenRaw() {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export { ACCESS_TTL_S, REFRESH_TTL_DAYS };
