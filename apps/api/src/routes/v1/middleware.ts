import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { verifyAccessToken } from "../../lib/tokens.js";

/** Verify the JWT and its account auth version before attaching the user. */
export async function authenticate(request: FastifyRequest) {
  const h = request.headers.authorization;
  if (!h?.startsWith("Bearer ")) return;
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(h.slice(7));
  } catch {
    /* invalid or expired token */
    return;
  }
  if (payload.typ !== "a") return;
  const account = (
    await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        authVersion: users.authVersion,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)
  )[0];
  if (!account || account.authVersion !== payload.ver) return;
  request.user = { id: account.id, email: account.email, role: account.role };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({ code: "UNAUTHENTICATED", message: "需要登录" });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const role = request.user?.role;
  if (role !== "admin" && role !== "org_admin") {
    return reply.status(403).send({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
}
