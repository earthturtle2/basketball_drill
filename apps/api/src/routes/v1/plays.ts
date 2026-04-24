import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { plays } from "../../db/schema.js";
import {
  buildDocumentFromInput,
  buildDocumentOnUpdate,
  DEFAULT_TACTIC_DOCUMENT,
} from "../../lib/tactic.js";
import { sendError, zodToMessage } from "../../lib/errors.js";
import { tryParseTacticDocumentV1 } from "@basketball/shared";

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

const duplicateBody = z.object({
  name: z.string().min(1).max(200).optional(),
});

function escapeIlike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function playRoutes(fastify: FastifyInstance) {
  fastify.get("/plays", async (request, reply) => {
    const q = listQuery.parse((request as { query: Record<string, string> }).query);
    const uid = request.user!.id;
    const conditions: [SQL, ...SQL[]] = [eq(plays.userId, uid), isNull(plays.deletedAt)];
    if (q.q) {
      const pattern = `%${escapeIlike(q.q)}%`;
      conditions.push(sql`lower(${plays.name}) like lower(${pattern})`);
    }
    if (q.tag) {
      conditions.push(
        sql`exists (select 1 from json_each(${plays.tags}) as j where j.value = ${q.tag})`,
      );
    }
    const where = and(...conditions);
    const totalRow = await db.select({ n: count() }).from(plays).where(where);
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

  fastify.post("/plays", async (request, reply) => {
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
    if (!row) return sendError(reply, 500, "INTERNAL", "创建失败");
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

  fastify.get("/plays/:playId", async (request, reply) => {
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

  fastify.patch("/plays/:playId", async (request, reply) => {
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
    if (!u) return sendError(reply, 500, "INTERNAL", "更新失败");
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

  fastify.delete("/plays/:playId", async (request, reply) => {
    const { playId } = request.params as { playId: string };
    const row = (await db.select().from(plays).where(eq(plays.id, playId)).limit(1))[0];
    if (!row || row.deletedAt || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    await db.update(plays).set({ deletedAt: new Date() }).where(eq(plays.id, playId));
    return reply.status(204).send();
  });

  fastify.post("/plays/:playId/duplicate", async (request, reply) => {
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
    if (!created) return sendError(reply, 500, "INTERNAL", "复制失败");
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
}
