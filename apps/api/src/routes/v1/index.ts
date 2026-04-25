import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authenticate, requireAdmin, requireAuth } from "./middleware.js";
import { authRoutes } from "./auth.js";
import { publicShareRoutes, protectedShareRoutes } from "./shares.js";
import { playRoutes } from "./plays.js";
import { teamRoutes } from "./teams.js";
import { adminRoutes } from "./admin.js";
import { db } from "../../db/index.js";
import { refreshTokens, users } from "../../db/schema.js";
import { sendError } from "../../lib/errors.js";

const passwordChangeBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function registerV1(fastify: FastifyInstance) {
  // Public routes (no auth required)
  await fastify.register(authRoutes);
  await fastify.register(publicShareRoutes);

  // Protected routes (JWT required)
  await fastify.register(async (f) => {
    f.addHook("preHandler", authenticate);
    f.addHook("preHandler", requireAuth);

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

    f.get("/accounts", async (_request, reply) => {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users);
      return reply.send(rows);
    });

    f.post("/me/password", async (request, reply) => {
      const b = passwordChangeBody.parse(request.body);
      const u = (await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1))[0];
      if (!u) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
      const ok = await bcrypt.compare(b.currentPassword, u.passwordHash);
      if (!ok) return sendError(reply, 400, "INVALID_PASSWORD", "当前密码错误");
      const passwordHash = await bcrypt.hash(b.newPassword, 10);
      await db.update(users).set({ passwordHash }).where(eq(users.id, u.id));
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, u.id));
      return reply.send({ ok: true });
    });

    await f.register(playRoutes);
    await f.register(teamRoutes);
    await f.register(protectedShareRoutes);
    await f.register(async (admin) => {
      admin.addHook("preHandler", requireAdmin);
      await admin.register(adminRoutes);
    });
  });
}
