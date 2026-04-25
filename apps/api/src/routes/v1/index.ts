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
import { refreshTokens, users, type UserRow } from "../../db/schema.js";
import { sendError, zodToMessage } from "../../lib/errors.js";
import { validateAvatarUrl } from "../../lib/user-profile.js";

const passwordChangeBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

const mePatchBody = z.object({
  /** 与注册接口 `name` 上限一致 */
  name: z.union([z.string().max(100), z.null()]).optional(),
  avatarUrl: z.union([z.string().max(120_000), z.null()]).optional(),
  bio: z.union([z.string().max(1000), z.null()]).optional(),
});

function serializeMeUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    role: row.role,
    avatarUrl: row.avatarUrl ?? null,
    bio: row.bio ?? null,
  };
}

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
      if (!full) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
      return reply.send(serializeMeUser(full));
    });

    f.patch("/me", async (request, reply) => {
      const parsed = mePatchBody.safeParse(request.body ?? {});
      if (!parsed.success) return sendError(reply, 400, "VALIDATION", zodToMessage(parsed.error));
      const patch = parsed.data;
      if (Object.keys(patch).length === 0) {
        const full = (await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1))[0];
        if (!full) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
        return reply.send(serializeMeUser(full));
      }
      const updates: Partial<Pick<UserRow, "name" | "avatarUrl" | "bio">> = {};
      if (patch.name !== undefined) {
        updates.name = patch.name === null ? null : patch.name.trim() || null;
      }
      if (patch.avatarUrl !== undefined) {
        if (patch.avatarUrl === null || patch.avatarUrl.trim() === "") {
          updates.avatarUrl = null;
        } else {
          const v = validateAvatarUrl(patch.avatarUrl);
          if (!v.ok) return sendError(reply, 400, "INVALID_AVATAR", v.message);
          updates.avatarUrl = v.value;
        }
      }
      if (patch.bio !== undefined) {
        updates.bio = patch.bio === null ? null : patch.bio.trim() || null;
      }
      if (Object.keys(updates).length === 0) {
        const full = (await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1))[0];
        if (!full) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
        return reply.send(serializeMeUser(full));
      }
      await db.update(users).set(updates).where(eq(users.id, request.user!.id));
      const full = (await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1))[0];
      if (!full) return sendError(reply, 404, "NOT_FOUND", "用户不存在");
      return reply.send(serializeMeUser(full));
    });

    f.get("/accounts", async (_request, reply) => {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
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
