import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ code, message });
}

export function zodToMessage(err: ZodError) {
  return err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
