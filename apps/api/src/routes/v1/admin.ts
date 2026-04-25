import type { FastifyInstance } from "fastify";
import { customAlphabet } from "nanoid";
import { count, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../../db/index.js";
import { inviteCodes, playShares, plays, refreshTokens, teams, users } from "../../db/schema.js";
import { sendError } from "../../lib/errors.js";

const inviteBody = z.object({
  expiresAt: z.string().datetime().optional(),
});

const passwordResetBody = z.object({
  password: z.string().min(8).max(128),
});

const makeInviteCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 12);

function toIso(d: Date | null) {
  return d ? d.toISOString() : null;
}

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/admin/users", async (_request, reply) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(500);

    return reply.send(rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
  });

  fastify.patch("/admin/users/:userId/password", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const b = passwordResetBody.parse(request.body);
    const row = (await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!row) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
    const passwordHash = await bcrypt.hash(b.password, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    return reply.send({ ok: true });
  });

  fastify.get("/admin/status", async (_request, reply) => {
    const [
      userCount,
      adminCount,
      teamCount,
      activePlayCount,
      deletedPlayCount,
      shareCount,
      refreshTokenCount,
      inviteCount,
      usedInviteCount,
    ] = await Promise.all([
      db.select({ n: count() }).from(users),
      db
        .select({ n: count() })
        .from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "org_admin"))),
      db.select({ n: count() }).from(teams),
      db.select({ n: count() }).from(plays).where(isNull(plays.deletedAt)),
      db.select({ n: count() }).from(plays).where(isNotNull(plays.deletedAt)),
      db.select({ n: count() }).from(playShares),
      db.select({ n: count() }).from(refreshTokens),
      db.select({ n: count() }).from(inviteCodes),
      db.select({ n: count() }).from(inviteCodes).where(isNotNull(inviteCodes.usedAt)),
    ]);
    const recentUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    return reply.send({
      users: Number(userCount[0]?.n ?? 0),
      admins: Number(adminCount[0]?.n ?? 0),
      teams: Number(teamCount[0]?.n ?? 0),
      activePlays: Number(activePlayCount[0]?.n ?? 0),
      deletedPlays: Number(deletedPlayCount[0]?.n ?? 0),
      shares: Number(shareCount[0]?.n ?? 0),
      activeSessions: Number(refreshTokenCount[0]?.n ?? 0),
      inviteCodes: Number(inviteCount[0]?.n ?? 0),
      usedInviteCodes: Number(usedInviteCount[0]?.n ?? 0),
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  });

  fastify.get("/admin/invite-codes", async (_request, reply) => {
    const rows = await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        createdBy: inviteCodes.createdBy,
        usedBy: inviteCodes.usedBy,
        expiresAt: inviteCodes.expiresAt,
        createdAt: inviteCodes.createdAt,
        usedAt: inviteCodes.usedAt,
      })
      .from(inviteCodes)
      .orderBy(desc(inviteCodes.createdAt))
      .limit(100);
    return reply.send(
      rows.map((r) => ({
        ...r,
        expiresAt: toIso(r.expiresAt),
        createdAt: r.createdAt.toISOString(),
        usedAt: toIso(r.usedAt),
      })),
    );
  });

  fastify.post("/admin/invite-codes", async (request, reply) => {
    const b = inviteBody.parse(request.body ?? {});
    const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
    for (let i = 0; i < 5; i += 1) {
      const code = makeInviteCode();
      try {
        const [row] = await db
          .insert(inviteCodes)
          .values({ code, createdBy: request.user!.id, expiresAt })
          .returning();
        if (!row) break;
        return reply.status(201).send({
          id: row.id,
          code: row.code,
          createdBy: row.createdBy,
          usedBy: row.usedBy,
          expiresAt: toIso(row.expiresAt),
          createdAt: row.createdAt.toISOString(),
          usedAt: toIso(row.usedAt),
        });
      } catch {
        // Extremely unlikely code collision; retry with a fresh code.
      }
    }
    return sendError(reply, 500, "INVITE_CREATE_FAILED", "生成邀请码失败");
  });
}
