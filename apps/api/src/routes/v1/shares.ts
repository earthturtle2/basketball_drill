import type { FastifyInstance } from "fastify";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { matchPreparations, matchPrepShares, playShares, plays } from "../../db/schema.js";
import { sendError } from "../../lib/errors.js";
import { env } from "../../lib/env.js";
import { serializePrepDetail } from "./match-preps.js";

const TOKEN_NAME_MAX_LENGTH = 48;
const TOKEN_RANDOM_DIGITS = 6;

function tokenNamePart(name: string) {
  const cleaned = name
    .normalize("NFKC")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, TOKEN_NAME_MAX_LENGTH)
    .replace(/-$/g, "");
  return cleaned || "share";
}

function randomDigits() {
  const min = 10 ** (TOKEN_RANDOM_DIGITS - 1);
  const max = 10 ** TOKEN_RANDOM_DIGITS;
  return String(randomInt(min, max));
}

async function createPlayShareToken(name: string) {
  const namePart = tokenNamePart(name);
  for (let i = 0; i < 10; i += 1) {
    const token = `${namePart}-${randomDigits()}`;
    const existing = (
      await db.select({ id: playShares.id }).from(playShares).where(eq(playShares.token, token)).limit(1)
    )[0];
    if (!existing) return token;
  }
  return `${namePart}-${Date.now()}-${randomDigits()}`;
}

async function createMatchPrepShareToken(title: string) {
  const namePart = tokenNamePart(title);
  for (let i = 0; i < 10; i += 1) {
    const token = `${namePart}-${randomDigits()}`;
    const existing = (
      await db.select({ id: matchPrepShares.id }).from(matchPrepShares).where(eq(matchPrepShares.token, token)).limit(1)
    )[0];
    if (!existing) return token;
  }
  return `${namePart}-${Date.now()}-${randomDigits()}`;
}

function buildShareResponse(s: typeof playShares.$inferSelect) {
  const viewUrl = `${env.publicAppUrl.replace(/\/$/, "")}/view/${s.token}`;
  return {
    shareId: s.id,
    token: s.token,
    viewUrl,
    expiresAt: null,
    createdAt: s.createdAt.toISOString(),
  };
}

function buildMatchPrepShareResponse(s: typeof matchPrepShares.$inferSelect) {
  const viewUrl = `${env.publicAppUrl.replace(/\/$/, "")}/view/prep/${s.token}`;
  return {
    shareId: s.id,
    token: s.token,
    viewUrl,
    expiresAt: null,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Public: anyone with the share token can view. */
export async function publicShareRoutes(fastify: FastifyInstance) {
  fastify.get("/shares/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const s = (
      await db.select().from(playShares).where(eq(playShares.token, token)).limit(1)
    )[0];
    if (!s) return sendError(reply, 404, "NOT_FOUND", "分享不存在或已撤销");
    const p = (await db.select().from(plays).where(eq(plays.id, s.playId)).limit(1))[0];
    if (!p || p.deletedAt) return sendError(reply, 404, "NOT_FOUND", "战术不存在");
    return reply.send({
      play: {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        document: p.document,
        updatedAt: p.updatedAt.toISOString(),
      },
      share: { id: s.id, expiresAt: null },
    });
  });

  fastify.get("/match-prep-shares/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const s = (
      await db.select().from(matchPrepShares).where(eq(matchPrepShares.token, token)).limit(1)
    )[0];
    if (!s) return sendError(reply, 404, "NOT_FOUND", "分享不存在或已撤销");
    const prep = (await db.select().from(matchPreparations).where(eq(matchPreparations.id, s.prepId)).limit(1))[0];
    if (!prep) return sendError(reply, 404, "NOT_FOUND", "比赛准备不存在");
    return reply.send({
      prep: await serializePrepDetail(prep),
      share: { id: s.id, expiresAt: null },
    });
  });
}

/** Protected: owner can create / delete shares. */
export async function protectedShareRoutes(fastify: FastifyInstance) {
  fastify.get("/plays/:playId/shares", async (request, reply) => {
    const { playId } = request.params as { playId: string };
    const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
    if (!row || row.deletedAt || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    const rows = await db.select().from(playShares).where(eq(playShares.playId, row.id));
    return reply.send(rows.map(buildShareResponse));
  });

  fastify.post("/plays/:playId/shares", async (request, reply) => {
    const { playId } = request.params as { playId: string };
    const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
    if (!row || row.deletedAt || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    const token = await createPlayShareToken(row.name);
    const [s] = await db
      .insert(playShares)
      .values({ playId: row.id, token, expiresAt: null })
      .returning();
    if (!s) return sendError(reply, 500, "INTERNAL", "创建分享失败");
    return reply.status(201).send(buildShareResponse(s));
  });

  fastify.get("/match-preps/:prepId/shares", async (request, reply) => {
    const { prepId } = request.params as { prepId: string };
    const row = (await db.select().from(matchPreparations).where(eq(matchPreparations.id, prepId)).limit(1))[0];
    if (!row || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    const rows = await db.select().from(matchPrepShares).where(eq(matchPrepShares.prepId, row.id));
    return reply.send(rows.map(buildMatchPrepShareResponse));
  });

  fastify.post("/match-preps/:prepId/shares", async (request, reply) => {
    const { prepId } = request.params as { prepId: string };
    const row = (await db.select().from(matchPreparations).where(eq(matchPreparations.id, prepId)).limit(1))[0];
    if (!row || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    const token = await createMatchPrepShareToken(row.title);
    const [s] = await db
      .insert(matchPrepShares)
      .values({ prepId: row.id, token, expiresAt: null })
      .returning();
    if (!s) return sendError(reply, 500, "INTERNAL", "创建分享失败");
    return reply.status(201).send(buildMatchPrepShareResponse(s));
  });

  fastify.delete("/shares/:shareId", async (request, reply) => {
    const { shareId } = request.params as { shareId: string };
    const s = (
      await db.select().from(playShares).where(eq(playShares.id, shareId)).limit(1)
    )[0];
    if (!s) return sendError(reply, 404, "NOT_FOUND", "未找到");
    const p = (await db.select().from(plays).where(eq(plays.id, s.playId)).limit(1))[0];
    if (!p || p.deletedAt || p.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    await db.delete(playShares).where(eq(playShares.id, shareId));
    return reply.status(204).send();
  });

  fastify.delete("/match-prep-shares/:shareId", async (request, reply) => {
    const { shareId } = request.params as { shareId: string };
    const s = (
      await db.select().from(matchPrepShares).where(eq(matchPrepShares.id, shareId)).limit(1)
    )[0];
    if (!s) return sendError(reply, 404, "NOT_FOUND", "未找到");
    const prep = (await db.select().from(matchPreparations).where(eq(matchPreparations.id, s.prepId)).limit(1))[0];
    if (!prep || prep.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    await db.delete(matchPrepShares).where(eq(matchPrepShares.id, shareId));
    return reply.status(204).send();
  });
}
