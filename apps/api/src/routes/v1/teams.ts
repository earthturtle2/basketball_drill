import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { teams, plays } from "../../db/schema.js";
import { sendError } from "../../lib/errors.js";

const teamBody = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(3).max(30).optional(),
});

const teamPatchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(3).max(30).optional(),
});

export async function teamRoutes(fastify: FastifyInstance) {
  fastify.get("/teams", async (request, reply) => {
    const uid = request.user!.id;
    const rows = await db
      .select()
      .from(teams)
      .where(eq(teams.userId, uid))
      .orderBy(teams.createdAt);
    return reply.send(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  });

  fastify.post("/teams", async (request, reply) => {
    const b = teamBody.parse(request.body);
    const [row] = await db
      .insert(teams)
      .values({
        userId: request.user!.id,
        name: b.name,
        color: b.color ?? "#e53935",
      })
      .returning();
    if (!row) return sendError(reply, 500, "INTERNAL", "创建失败");
    return reply.status(201).send({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt.toISOString(),
    });
  });

  fastify.patch("/teams/:teamId", async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const b = teamPatchBody.parse(request.body);
    const row = (
      await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
    )[0];
    if (!row || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    const [u] = await db
      .update(teams)
      .set({
        name: b.name ?? row.name,
        color: b.color ?? row.color,
      })
      .where(eq(teams.id, teamId))
      .returning();
    if (!u) return sendError(reply, 500, "INTERNAL", "更新失败");
    return reply.send({
      id: u.id,
      name: u.name,
      color: u.color,
      createdAt: u.createdAt.toISOString(),
    });
  });

  fastify.delete("/teams/:teamId", async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const row = (
      await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
    )[0];
    if (!row || row.userId !== request.user!.id) {
      return sendError(reply, 404, "NOT_FOUND", "未找到");
    }
    await db
      .update(plays)
      .set({ teamId: null })
      .where(and(eq(plays.teamId, teamId), eq(plays.userId, request.user!.id)));
    await db.delete(teams).where(eq(teams.id, teamId));
    return reply.status(204).send();
  });
}
