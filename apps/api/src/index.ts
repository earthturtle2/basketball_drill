import "./lib/env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerV1 } from "./routes/v1.js";
import { env } from "./lib/env.js";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.get("/health", async () => ({ status: "ok" as const }));

  await app.register(registerV1, { prefix: "/api/v1" });

  await app.listen({ port: env.port, host: env.host });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
