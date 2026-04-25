import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { count, eq, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../../db/index.js";
import { inviteCodes, users, refreshTokens } from "../../db/schema.js";
import {
  signAccessToken,
  createRefreshTokenRaw,
  hashRefreshToken,
  refreshExpiresAt,
  ACCESS_TTL_S,
} from "../../lib/tokens.js";
import { sendError } from "../../lib/errors.js";

const registerBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
  inviteCode: z.string().trim().min(1).max(64).optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

async function issueTokens(user: { id: string; email: string; role: string }) {
  const accessToken = signAccessToken(user);
  const raw = createRefreshTokenRaw();
  const tokenHash = hashRefreshToken(raw);
  const exp = refreshExpiresAt();
  await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt: exp });
  return { accessToken, refreshToken: raw, expiresIn: ACCESS_TTL_S };
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/register", async (request, reply) => {
    const b = registerBody.parse(request.body);
    const exists = (await db.select().from(users).where(eq(users.email, b.email)).limit(1))[0];
    if (exists) return sendError(reply, 409, "EMAIL_TAKEN", "该邮箱已注册");
    const userCount = (await db.select({ n: count() }).from(users))[0]?.n ?? 0;
    const isFirstUser = Number(userCount) === 0;
    const invite = b.inviteCode
      ? (await db.select().from(inviteCodes).where(eq(inviteCodes.code, b.inviteCode)).limit(1))[0]
      : undefined;
    if (!isFirstUser) {
      if (!invite) return sendError(reply, 400, "INVITE_REQUIRED", "需要有效邀请码才能注册");
      if (invite.usedAt) return sendError(reply, 400, "INVITE_USED", "邀请码已被使用");
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return sendError(reply, 400, "INVITE_EXPIRED", "邀请码已过期");
      }
    }
    const passwordHash = await bcrypt.hash(b.password, 10);
    const u = db.transaction((tx) => {
      const created = tx
        .insert(users)
        .values({
          email: b.email,
          passwordHash,
          name: b.name ?? null,
          role: isFirstUser ? "admin" : "coach",
        })
        .returning()
        .get();
      if (created && invite) {
        tx.update(inviteCodes)
          .set({ usedBy: created.id, usedAt: new Date() })
          .where(eq(inviteCodes.id, invite.id))
          .run();
      }
      return created;
    });
    if (!u) return sendError(reply, 500, "INTERNAL", "创建用户失败");
    return reply.send(await issueTokens(u));
  });

  fastify.post("/auth/login", async (request, reply) => {
    const b = loginBody.parse(request.body);
    const u = (await db.select().from(users).where(eq(users.email, b.email)).limit(1))[0];
    if (!u) return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    const ok = await bcrypt.compare(b.password, u.passwordHash);
    if (!ok) return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    return reply.send(await issueTokens(u));
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    const b = refreshBody.parse(request.body);
    const h = hashRefreshToken(b.refreshToken);
    const row = (
      await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, h)).limit(1)
    )[0];
    if (!row || row.expiresAt < new Date()) {
      return sendError(reply, 401, "INVALID_REFRESH", "登录已过期，请重新登录");
    }
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    const u = (await db.select().from(users).where(eq(users.id, row.userId)).limit(1))[0];
    if (!u) return sendError(reply, 401, "INVALID_REFRESH", "用户不存在");
    return reply.send(await issueTokens(u));
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const b = refreshBody.parse(request.body);
    const h = hashRefreshToken(b.refreshToken);
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, h));
    return reply.send({ ok: true });
  });

  // Periodically clean up expired refresh tokens
  const CLEANUP_MS = 6 * 60 * 60 * 1000;
  const cleanup = async () => {
    try {
      await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
    } catch {
      /* ignore cleanup errors */
    }
  };
  void cleanup();
  const timer = setInterval(() => void cleanup(), CLEANUP_MS);
  fastify.addHook("onClose", () => clearInterval(timer));
}
