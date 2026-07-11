import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, sqliteDb } from "../../db/index.js";
import { refreshTokens } from "../../db/schema.js";
import {
  signAccessToken,
  createRefreshTokenRaw,
  createPasswordResetTokenRaw,
  hashRefreshToken,
  hashPasswordResetToken,
  refreshExpiresAt,
  getAccessTtlSeconds,
} from "../../lib/tokens.js";
import { HttpError, sendError } from "../../lib/errors.js";
import { env } from "../../lib/env.js";
import {
  passwordResetDeliveryReady,
  sendPasswordResetEmail,
} from "../../lib/password-reset-email.js";

const registerBody = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
  inviteCode: z.string().trim().min(1).max(64).optional(),
});

const loginBody = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

const forgotPasswordBody = z.object({
  email: z.string().trim().email().max(255),
});

const resetPasswordBody = z.object({
  token: z.string().min(32).max(256),
  newPassword: z.string().min(8).max(128),
});

const REFRESH_COOKIE = "basketball_refresh";

type RegisterTxInput = {
  email: string;
  passwordHash: string;
  name?: string | null;
  inviteCode?: string;
};

type SessionUser = {
  id: string;
  email: string;
  role: string;
  authVersion: number;
};

type SessionRecord = {
  user: SessionUser;
  rawToken: string;
  expiresAt: number;
};

type PasswordResetIssue = {
  email: string;
  rawToken: string;
  tokenHash: string;
};

const registerUserTx = sqliteDb.transaction((input: RegisterTxInput): SessionRecord => {
  const now = Date.now();
  const duplicate = sqliteDb
    .prepare("select id from users where email = ? collate nocase limit 1")
    .get(input.email);
  if (duplicate) {
    throw new HttpError(409, "EMAIL_TAKEN", "该邮箱已注册");
  }

  const countRow = sqliteDb.prepare("select count(*) as n from users").get() as
    | { n: number | bigint }
    | undefined;
  const isFirstUser = Number(countRow?.n ?? 0) === 0;
  let invite:
    | { id: string; used_at: number | null; expires_at: number | null }
    | undefined;

  if (input.inviteCode) {
    invite = sqliteDb
      .prepare("select id, used_at, expires_at from invite_codes where code = ? limit 1")
      .get(input.inviteCode) as
      | { id: string; used_at: number | null; expires_at: number | null }
      | undefined;
  }

  if (!isFirstUser) {
    if (!invite) throw new HttpError(400, "INVITE_REQUIRED", "需要有效邀请码才能注册");
    if (invite.used_at) throw new HttpError(400, "INVITE_USED", "邀请码已被使用");
    if (invite.expires_at && invite.expires_at < now) {
      throw new HttpError(400, "INVITE_EXPIRED", "邀请码已过期");
    }
  }

  const userId = randomUUID();
  const role = isFirstUser ? "admin" : "coach";
  sqliteDb
    .prepare(
      `insert into users (id, email, password_hash, name, role, created_at)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, input.email, input.passwordHash, input.name ?? null, role, now);

  if (!isFirstUser && invite) {
    const updated = sqliteDb
      .prepare("update invite_codes set used_by = ?, used_at = ? where id = ? and used_at is null")
      .run(userId, now, invite.id);
    if (updated.changes !== 1) {
      throw new HttpError(400, "INVITE_USED", "邀请码已被使用");
    }
  }

  return insertSessionRecord(
    { id: userId, email: input.email, role, authVersion: 0 },
    now,
  );
});

function insertSessionRecord(user: SessionUser, now = Date.now()): SessionRecord {
  const rawToken = createRefreshTokenRaw();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = refreshExpiresAt().getTime();
  sqliteDb
    .prepare(
      `insert into refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       values (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), user.id, tokenHash, expiresAt, now);
  return { user, rawToken, expiresAt };
}

const issueLoginSessionTx = sqliteDb.transaction(
  (input: {
    userId: string;
    expectedPasswordHash: string;
    expectedAuthVersion: number;
  }): SessionRecord | null => {
    const user = sqliteDb
      .prepare(
        `select id, email, role, auth_version from users
         where id = ? and password_hash = ? and auth_version = ? limit 1`,
      )
      .get(
        input.userId,
        input.expectedPasswordHash,
        input.expectedAuthVersion,
      ) as
      | { id: string; email: string; role: string; auth_version: number }
      | undefined;
    if (!user) return null;
    return insertSessionRecord({
      id: user.id,
      email: user.email,
      role: user.role,
      authVersion: user.auth_version,
    });
  },
);

const rotateRefreshSessionTx = sqliteDb.transaction(
  (input: { tokenHash: string; now: number }): SessionRecord | null => {
    const token = sqliteDb
      .prepare(
        `select id, user_id, expires_at from refresh_tokens
         where token_hash = ? limit 1`,
      )
      .get(input.tokenHash) as
      | { id: string; user_id: string; expires_at: number }
      | undefined;
    if (!token) return null;
    if (token.expires_at < input.now) {
      sqliteDb.prepare("delete from refresh_tokens where id = ?").run(token.id);
      return null;
    }

    const user = sqliteDb
      .prepare("select id, email, role, auth_version from users where id = ? limit 1")
      .get(token.user_id) as
      | { id: string; email: string; role: string; auth_version: number }
      | undefined;
    if (!user) return null;

    const deleted = sqliteDb
      .prepare("delete from refresh_tokens where id = ? and token_hash = ?")
      .run(token.id, input.tokenHash);
    if (deleted.changes !== 1) return null;
    return insertSessionRecord(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        authVersion: user.auth_version,
      },
      input.now,
    );
  },
);

const issuePasswordResetTx = sqliteDb.transaction(
  (input: { email: string; now: number }): PasswordResetIssue | null => {
    const matches = sqliteDb
      .prepare("select id, email from users where email = ? collate nocase limit 2")
      .all(input.email) as Array<{ id: string; email: string }>;
    if (matches.length !== 1) return null;
    const user = matches[0];

    const latest = sqliteDb
      .prepare(
        `select created_at from password_reset_tokens
         where user_id = ?
         order by created_at desc limit 1`,
      )
      .get(user.id) as { created_at: number } | undefined;
    if (
      latest &&
      input.now - latest.created_at < env.passwordResetCooldownSeconds * 1000
    ) {
      return null;
    }

    const counts = sqliteDb
      .prepare(
        `select
           sum(case when created_at >= ? then 1 else 0 end) as hourly,
           count(*) as daily,
           sum(case when used_at is null and expires_at >= ? then 1 else 0 end) as active
         from password_reset_tokens
         where user_id = ? and created_at >= ?`,
      )
      .get(
        input.now - 60 * 60 * 1000,
        input.now,
        user.id,
        input.now - 24 * 60 * 60 * 1000,
      ) as { hourly: number | null; daily: number; active: number | null };
    if ((counts.hourly ?? 0) >= 3 || counts.daily >= 10 || (counts.active ?? 0) >= 3) {
      return null;
    }

    const rawToken = createPasswordResetTokenRaw();
    const tokenHash = hashPasswordResetToken(rawToken);
    sqliteDb
      .prepare(
        `insert into password_reset_tokens
          (id, user_id, token_hash, expires_at, created_at, used_at)
         values (?, ?, ?, ?, ?, null)`,
      )
      .run(
        randomUUID(),
        user.id,
        tokenHash,
        input.now + env.passwordResetTtlMinutes * 60 * 1000,
        input.now,
      );
    return { email: user.email, rawToken, tokenHash };
  },
);

const consumePasswordResetTx = sqliteDb.transaction(
  (input: { tokenHash: string; passwordHash: string; now: number }) => {
    const token = sqliteDb
      .prepare(
        `select id, user_id from password_reset_tokens
         where token_hash = ? and used_at is null and expires_at >= ? limit 1`,
      )
      .get(input.tokenHash, input.now) as { id: string; user_id: string } | undefined;
    if (!token) return false;

    const consumed = sqliteDb
      .prepare(
        `update password_reset_tokens set used_at = ?
         where id = ? and used_at is null and expires_at >= ?`,
      )
      .run(input.now, token.id, input.now);
    if (consumed.changes !== 1) return false;

    const updated = sqliteDb
      .prepare(
        `update users
         set password_hash = ?, auth_version = auth_version + 1
         where id = ?`,
      )
      .run(input.passwordHash, token.user_id);
    if (updated.changes !== 1) return false;
    sqliteDb.prepare("delete from refresh_tokens where user_id = ?").run(token.user_id);
    sqliteDb
      .prepare(
        `update password_reset_tokens set used_at = ?
         where user_id = ? and used_at is null`,
      )
      .run(input.now, token.user_id);
    return true;
  },
);

function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

function cookieMaxAgeSeconds(expiresAt: number) {
  return Math.floor((expiresAt - Date.now()) / 1000);
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, maxAgeSeconds)}`,
  ];
  if (cookieSecure()) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(request: FastifyRequest, name: string) {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function setRefreshCookie(reply: FastifyReply, raw: string, expiresAt: number) {
  reply.header(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE, raw, cookieMaxAgeSeconds(expiresAt)),
  );
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.header("Set-Cookie", serializeCookie(REFRESH_COOKIE, "", 0));
}

function sendSession(record: SessionRecord, reply: FastifyReply) {
  const accessToken = signAccessToken(record.user);
  setRefreshCookie(reply, record.rawToken, record.expiresAt);
  return { accessToken, expiresIn: getAccessTtlSeconds() };
}

export async function authRoutes(fastify: FastifyInstance) {
  const pendingResetEmails = new Set<Promise<void>>();

  fastify.post("/auth/register", async (request, reply) => {
    const b = registerBody.parse(request.body);
    const passwordHash = await bcrypt.hash(b.password, 10);
    const session = registerUserTx.immediate({
      email: b.email.toLowerCase(),
      passwordHash,
      name: b.name ?? null,
      inviteCode: b.inviteCode,
    });
    return reply.send(sendSession(session, reply));
  });

  fastify.post("/auth/login", async (request, reply) => {
    const b = loginBody.parse(request.body);
    const u = sqliteDb
      .prepare(
        `select id, email, password_hash, role, auth_version from users
         where email = ? collate nocase
         order by case when email = ? then 0 else 1 end
         limit 1`,
      )
      .get(b.email, b.email) as
      | {
          id: string;
          email: string;
          password_hash: string;
          role: string;
          auth_version: number;
        }
      | undefined;
    if (!u) return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    const ok = await bcrypt.compare(b.password, u.password_hash);
    if (!ok) return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    const session = issueLoginSessionTx.immediate({
      userId: u.id,
      expectedPasswordHash: u.password_hash,
      expectedAuthVersion: u.auth_version,
    });
    if (!session) {
      return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    }
    return reply.send(sendSession(session, reply));
  });

  fastify.post(
    "/auth/forgot-password",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "15 minutes" },
      },
    },
    async (request, reply) => {
      const startedAt = Date.now();
      const b = forgotPasswordBody.parse(request.body);
      if (!passwordResetDeliveryReady()) {
        return sendError(
          reply,
          503,
          "RESET_EMAIL_UNAVAILABLE",
          "找回密码服务暂不可用，请稍后再试",
        );
      }

      const issued = issuePasswordResetTx.immediate({ email: b.email, now: startedAt });
      if (issued) {
        const resetUrl = new URL("/reset-password", env.publicAppUrl);
        resetUrl.hash = new URLSearchParams({ token: issued.rawToken }).toString();
        const delivery = sendPasswordResetEmail({
          email: issued.email,
          resetUrl: resetUrl.toString(),
          logger: request.log,
        })
          .catch((error) => {
            request.log.error({ err: error }, "Failed to send password reset email");
            try {
              sqliteDb
                .prepare(
                  `update password_reset_tokens set used_at = ?
                   where token_hash = ? and used_at is null`,
                )
                .run(Date.now(), issued.tokenHash);
            } catch (cleanupError) {
              request.log.error(
                { err: cleanupError },
                "Failed to clean up an undelivered password reset token",
              );
            }
          })
          .finally(() => pendingResetEmails.delete(delivery));
        pendingResetEmails.add(delivery);
      }

      const remainingDelay = 250 - (Date.now() - startedAt);
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
      return reply.status(202).send({
        ok: true,
        retryAfterSeconds: env.passwordResetCooldownSeconds,
        expiresInMinutes: env.passwordResetTtlMinutes,
      });
    },
  );

  fastify.post(
    "/auth/reset-password",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "15 minutes" },
      },
    },
    async (request, reply) => {
      const b = resetPasswordBody.parse(request.body);
      const tokenHash = hashPasswordResetToken(b.token);
      const now = Date.now();
      const candidate = sqliteDb
        .prepare(
          `select id from password_reset_tokens
           where token_hash = ? and used_at is null and expires_at >= ? limit 1`,
        )
        .get(tokenHash, now);
      if (!candidate) {
        return sendError(
          reply,
          400,
          "INVALID_RESET_TOKEN",
          "重置链接无效或已过期，请重新申请",
        );
      }

      const passwordHash = await bcrypt.hash(b.newPassword, 10);
      const changed = consumePasswordResetTx.immediate({
        tokenHash,
        passwordHash,
        now: Date.now(),
      });
      if (!changed) {
        return sendError(
          reply,
          400,
          "INVALID_RESET_TOKEN",
          "重置链接无效或已过期，请重新申请",
        );
      }
      clearRefreshCookie(reply);
      return reply.send({ ok: true });
    },
  );

  fastify.post("/auth/refresh", async (request, reply) => {
    const b = refreshBody.parse(request.body ?? {});
    const rawRefresh = b.refreshToken ?? readCookie(request, REFRESH_COOKIE);
    if (!rawRefresh) {
      clearRefreshCookie(reply);
      return sendError(reply, 401, "INVALID_REFRESH", "登录已过期，请重新登录");
    }
    const session = rotateRefreshSessionTx.immediate({
      tokenHash: hashRefreshToken(rawRefresh),
      now: Date.now(),
    });
    if (!session) {
      clearRefreshCookie(reply);
      return sendError(reply, 401, "INVALID_REFRESH", "登录已过期，请重新登录");
    }
    return reply.send(sendSession(session, reply));
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const b = refreshBody.parse(request.body ?? {});
    const rawRefresh = b.refreshToken ?? readCookie(request, REFRESH_COOKIE);
    if (rawRefresh) {
      const h = hashRefreshToken(rawRefresh);
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, h));
    }
    clearRefreshCookie(reply);
    return reply.send({ ok: true });
  });

  // Periodically clean up expired refresh tokens
  const CLEANUP_MS = 6 * 60 * 60 * 1000;
  const cleanup = async () => {
    try {
      await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
      const now = Date.now();
      sqliteDb
        .prepare(
          `delete from password_reset_tokens
           where created_at < ?`,
        )
        .run(now - 24 * 60 * 60 * 1000);
    } catch {
      /* ignore cleanup errors */
    }
  };
  void cleanup();
  const timer = setInterval(() => void cleanup(), CLEANUP_MS);
  fastify.addHook("onClose", async () => {
    clearInterval(timer);
    await Promise.allSettled([...pendingResetEmails]);
  });
}
