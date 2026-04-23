import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, count, desc, eq, ilike, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { playShares, plays, refreshTokens, users } from "../db/schema.js";
import { buildDocumentFromInput, buildDocumentOnUpdate, DEFAULT_TACTIC_DOCUMENT } from "../lib/tactic.js";
import { sendError, zodToMessage } from "../lib/errors.js";
import {
  createRefreshTokenRaw,
  hashRefreshToken,
  refreshExpiresAt,
  signAccessToken,
  verifyAccessToken,
} from "../lib/tokens.js";
import { tryParseTacticDocumentV1 } from "@basketball/shared";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { env } from "../lib/env.js";
import { ACCESS_TTL_S } from "../lib/tokens.js";

const registerBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

const playCreateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(64)).max(32).optional(),
  document: z.unknown().optional(),
});

const playPatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(64)).max(32).optional(),
  document: z.unknown().optional(),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  tag: z.string().max(64).optional(),
});

const shareCreateBody = z.object({
  expiresAt: z.string().datetime().optional(),
});

const duplicateBody = z.object({
  name: z.string().min(1).max(200).optional(),
});

function escapeIlike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function registerV1(fastify: FastifyInstance) {
  const authPre = {
    preHandler: async (request: { headers: { authorization?: string } }) => {
      const h = request.headers.authorization;
      if (!h?.startsWith("Bearer ")) return;
      const token = h.slice(7);
      try {
        const p = verifyAccessToken(token);
        if (p.typ !== "a") return;
        const u = (await db.select().from(users).where(eq(users.id, p.sub)).limit(1))[0];
        if (u) {
          (request as unknown as { user: { id: string; email: string; role: string } }).user = {
            id: u.id,
            email: u.email,
            role: u.role,
          };
        }
      } catch {
        /* 无效 token：未登录 */
      }
    },
  };

  const mustAuth = {
    preHandler: async (request: { user?: { id: string } }, reply: { status: (c: number) => { send: (b: unknown) => void } }) => {
      if (!request.user) {
        return reply.status(401).send({ code: "UNAUTHENTICATED", message: "需要登录" });
      }
    },
  };

  const issueTokens = async (userId: string) => {
    const accessToken = signAccessToken(userId);
    const raw = createRefreshTokenRaw();
    const tokenHash = hashRefreshToken(raw);
    const exp = refreshExpiresAt();
    await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt: exp });
    return { accessToken, refreshToken: raw, expiresIn: ACCESS_TTL_S };
  };

  fastify.post("/auth/register", async (request, reply) => {
    const b = registerBody.parse(request.body);
    const exists = (await db.select().from(users).where(eq(users.email, b.email)).limit(1))[0];
    if (exists) {
      return sendError(reply, 409, "EMAIL_TAKEN", "该邮箱已注册");
    }
    const passwordHash = await bcrypt.hash(b.password, 10);
    const [u] = await db
      .insert(users)
      .values({ email: b.email, passwordHash, name: b.name ?? null })
      .returning();
    if (!u) {
      return sendError(reply, 500, "INTERNAL", "创建用户失败");
    }
    const tokens = await issueTokens(u.id);
    return reply.send(tokens);
  });

  fastify.post("/auth/login", async (request, reply) => {
    const b = loginBody.parse(request.body);
    const u = (await db.select().from(users).where(eq(users.email, b.email)).limit(1))[0];
    if (!u) {
      return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    }
    const ok = await bcrypt.compare(b.password, u.passwordHash);
    if (!ok) {
      return sendError(reply, 401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    }
    const tokens = await issueTokens(u.id);
    return reply.send(tokens);
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    const b = refreshBody.parse(request.body);
    const h = hashRefreshToken(b.refreshToken);
    const row = (await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, h)).limit(1))[0];
    if (!row || row.expiresAt < new Date()) {
      return sendError(reply, 401, "INVALID_REFRESH", "登录已过期，请重新登录");
    }
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    const tokens = await issueTokens(row.userId);
    return reply.send(tokens);
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const b = refreshBody.parse(request.body);
    const h = hashRefreshToken(b.refreshToken);
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, h));
    return reply.send({ ok: true });
  });

  fastify.get("/shares/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const s = (await db.select().from(playShares).where(eq(playShares.token, token)).limit(1))[0];
    if (!s) {
      return sendError(reply, 404, "NOT_FOUND", "分享不存在或已撤销");
    }
    if (s.expiresAt && s.expiresAt < new Date()) {
      return sendError(reply, 410, "GONE", "分享已过期");
    }
    const p = (await db.select().from(plays).where(eq(plays.id, s.playId)).limit(1))[0];
    if (!p || p.deletedAt) {
      return sendError(reply, 404, "NOT_FOUND", "战术不存在");
    }
    return reply.send({
      play: {
        id: p.id,
        name: p.name,
        description: p.description,
        tags: p.tags,
        document: p.document,
        updatedAt: p.updatedAt.toISOString(),
      },
      share: { id: s.id, expiresAt: s.expiresAt?.toISOString() ?? null },
    });
  });

  const protectedPlugin = async (f: FastifyInstance) => {
    f.addHook("preHandler", authPre.preHandler);
    f.addHook("preHandler", mustAuth.preHandler);

    f.get("/me", async (request, reply) => {
      const u = request.user!;
      const full = (await db.select().from(users).where(eq(users.id, u.id)).limit(1))[0];
      return reply.send({
        id: u.id,
        email: u.email,
        name: full?.name ?? null,
        role: u.role,
      });
    });

    f.get("/plays", async (request, reply) => {
      const q = listQuery.parse((request as { query: Record<string, string> }).query);
      const uid = request.user!.id;
      const conditions: [SQL, ...SQL[]] = [eq(plays.userId, uid), isNull(plays.deletedAt)];
      if (q.q) {
        const pattern = `%${escapeIlike(q.q)}%`;
        conditions.push(ilike(plays.name, pattern));
      }
      if (q.tag) {
        conditions.push(sql`${q.tag} = ANY(${plays.tags})`);
      }
      const where = and(...conditions);
      const totalRow = await db
        .select({ n: count() })
        .from(plays)
        .where(where);
      const total = totalRow[0]?.n ?? 0;
      const offset = (q.page - 1) * q.pageSize;
      const rows = await db
        .select({
          id: plays.id,
          name: plays.name,
          description: plays.description,
          tags: plays.tags,
          updatedAt: plays.updatedAt,
        })
        .from(plays)
        .where(where)
        .orderBy(desc(plays.updatedAt))
        .limit(q.pageSize)
        .offset(offset);
      return reply.send({
        items: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total),
      });
    });

    f.post("/plays", async (request, reply) => {
      const b = playCreateBody.parse(request.body);
      const docInput = b.document !== undefined ? b.document : DEFAULT_TACTIC_DOCUMENT;
      const r = tryParseTacticDocumentV1(docInput);
      if (!r.success) {
        return reply.status(400).send({ code: "VALIDATION", message: zodToMessage(r.error) });
      }
      const document = buildDocumentFromInput({
        name: b.name,
        description: b.description,
        tags: b.tags,
        document: r.data,
      });
      const [row] = await db
        .insert(plays)
        .values({
          userId: request.user!.id,
          name: b.name,
          description: b.description ?? null,
          tags: b.tags ?? [],
          document,
        })
        .returning();
      if (!row) {
        return sendError(reply, 500, "INTERNAL", "创建失败");
      }
      return reply.status(201).send({
        id: row.id,
        name: row.name,
        description: row.description,
        tags: row.tags,
        document: row.document,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    });

    f.get("/plays/:playId", async (request, reply) => {
      const { playId } = request.params as { playId: string };
      const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
      if (!row || row.deletedAt || row.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      return reply.send({
        id: row.id,
        name: row.name,
        description: row.description,
        tags: row.tags,
        document: row.document,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    });

    f.patch("/plays/:playId", async (request, reply) => {
      const { playId } = request.params as { playId: string };
      const b = playPatchBody.parse(request.body);
      const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
      if (!row || row.deletedAt || row.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      if (b.document !== undefined) {
        const r = tryParseTacticDocumentV1(b.document);
        if (!r.success) {
          return reply.status(400).send({ code: "VALIDATION", message: zodToMessage(r.error) });
        }
      }
      const document = buildDocumentOnUpdate(row.document, row.name, b);
      const [u] = await db
        .update(plays)
        .set({
          name: b.name !== undefined ? b.name : row.name,
          description: b.description === undefined ? row.description : b.description,
          tags: b.tags !== undefined ? b.tags : row.tags,
          document,
          updatedAt: new Date(),
        })
        .where(eq(plays.id, playId))
        .returning();
      if (!u) {
        return sendError(reply, 500, "INTERNAL", "更新失败");
      }
      return reply.send({
        id: u.id,
        name: u.name,
        description: u.description,
        tags: u.tags,
        document: u.document,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      });
    });

    f.delete("/plays/:playId", async (request, reply) => {
      const { playId } = request.params as { playId: string };
      const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
      if (!row || row.deletedAt || row.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      await db
        .update(plays)
        .set({ deletedAt: new Date() })
        .where(eq(plays.id, playId));
      return reply.status(204).send();
    });

    f.post("/plays/:playId/duplicate", async (request, reply) => {
      const { playId } = request.params as { playId: string };
      const b = duplicateBody.parse(request.body ?? {});
      const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
      if (!row || row.deletedAt || row.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      const newName = b.name?.trim() || `${row.name}（副本）`;
      const [created] = await db
        .insert(plays)
        .values({
          userId: request.user!.id,
          name: newName,
          description: row.description,
          tags: row.tags,
          document: buildDocumentOnUpdate(row.document, row.name, { name: newName }),
        })
        .returning();
      if (!created) {
        return sendError(reply, 500, "INTERNAL", "复制失败");
      }
      return reply.status(201).send({
        id: created.id,
        name: created.name,
        description: created.description,
        tags: created.tags,
        document: created.document,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    });

    f.post("/plays/:playId/shares", async (request, reply) => {
      const { playId } = request.params as { playId: string };
      const body = shareCreateBody.parse((request as { body: unknown }).body ?? {});
      const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
      if (!row || row.deletedAt || row.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      const token = nanoid(12);
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      const [s] = await db
        .insert(playShares)
        .values({
          playId: row.id,
          token,
          expiresAt: expiresAt ?? null,
        })
        .returning();
      if (!s) {
        return sendError(reply, 500, "INTERNAL", "创建分享失败");
      }
      const viewUrl = `${env.publicAppUrl.replace(/\/$/, "")}/view/${token}`;
      return reply.status(201).send({
        shareId: s.id,
        token: s.token,
        viewUrl,
        expiresAt: s.expiresAt?.toISOString() ?? null,
      });
    });

    f.delete("/shares/:shareId", async (request, reply) => {
      const { shareId } = request.params as { shareId: string };
      const s = (await db.select().from(playShares).where(eq(playShares.id, shareId)).limit(1))[0];
      if (!s) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      const p = (await db.select().from(plays).where(eq(plays.id, s.playId)).limit(1))[0];
      if (!p || p.userId !== request.user!.id) {
        return sendError(reply, 404, "NOT_FOUND", "未找到");
      }
      await db.delete(playShares).where(eq(playShares.id, shareId));
      return reply.status(204).send();
    });
  };

  await fastify.register(protectedPlugin);
}
