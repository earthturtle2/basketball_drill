import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_DAYS = 7;

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  typ: "a";
  exp: number;
  iat: number;
}

export function signAccessToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, typ: "a" },
    env.jwtAccessSecret,
    { expiresIn: ACCESS_TTL_S },
  );
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
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
