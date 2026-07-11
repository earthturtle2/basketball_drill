import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  ver: number;
  typ: "a";
  exp: number;
  iat: number;
}

export function signAccessToken(user: {
  id: string;
  email: string;
  role: string;
  authVersion: number;
}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      ver: user.authVersion,
      typ: "a",
    },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtlSeconds },
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

export function createPasswordResetTokenRaw() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function refreshExpiresAt() {
  return new Date(
    Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  );
}

export function getAccessTtlSeconds() {
  return env.accessTokenTtlSeconds;
}
