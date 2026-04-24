import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { authenticate, requireAuth } from "./middleware.js";
import { authRoutes } from "./auth.js";
import { publicShareRoutes, protectedShareRoutes } from "./shares.js";
import { playRoutes } from "./plays.js";
import { teamRoutes } from "./teams.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

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

    await f.register(playRoutes);
    await f.register(teamRoutes);
    await f.register(protectedShareRoutes);
  });
}
