import "./lib/env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerV1 } from "./routes/v1/index.js";
import { globalErrorHandler } from "./lib/errors.js";
import { env } from "./lib/env.js";

async function main() {
  const app = Fastify({
    logger: true,
    trustProxy: process.env.NODE_ENV === "production" ? ["127.0.0.1", "::1"] : false,
  });

  app.setErrorHandler(globalErrorHandler);

  await app.register(cors, {
    origin:
      process.env.NODE_ENV === "production"
        ? [env.publicAppUrl.replace(/\/$/, "")]
        : true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.addHook("onRequest", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self'",
      ].join("; "),
    );
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ status: "ok" as const }));

  await app.register(registerV1, { prefix: "/api/v1" });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, "Shutting down API");
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Failed to shut down API cleanly");
      process.exit(1);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.port, host: env.host });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
