import { z } from "zod";

const vec2d = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  facingDeg: z.number().optional(),
});

const keyframe = z.object({
  t: z.number().int().min(0),
  poses: z.record(z.string().min(1), vec2d),
});

const event = z
  .object({
    t: z.number().int().min(0),
    kind: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

const actor = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("player"),
    team: z.enum(["offense", "defense"]),
    number: z.number().int().min(0).max(99),
    label: z.string(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("ball"),
    heldBy: z.string().optional(),
  }),
]);

export const TacticDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    meta: z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        tags: z.array(z.string().max(64)).max(32).optional(),
        court: z
          .object({
            preset: z.string().optional(),
            orientation: z.string().optional(),
            sizeMeters: z
              .object({
                length: z.number().positive(),
                width: z.number().positive(),
              })
              .optional(),
          })
          .passthrough()
          .optional(),
        durationMs: z.number().int().min(0).max(3600_000).optional(),
      })
      .passthrough(),
    teams: z
      .object({
        offense: z
          .object({ id: z.string(), label: z.string(), color: z.string().optional() })
          .passthrough(),
        defense: z
          .object({ id: z.string(), label: z.string(), color: z.string().optional() })
          .passthrough(),
      })
      .passthrough(),
    actors: z.array(actor).min(1).max(32),
    keyframes: z.array(keyframe).min(1).max(500),
    events: z.array(event).max(200).optional(),
    interpolation: z
      .object({
        position: z.string().optional(),
        facing: z.string().optional(),
      })
      .optional(),
    rules: z
      .object({
        coordinateSystem: z.literal("normalized"),
        bounds: z
          .object({
            x: z.tuple([z.number(), z.number()]),
            y: z.tuple([z.number(), z.number()]),
          })
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict();

export type TacticDocumentV1 = z.infer<typeof TacticDocumentV1Schema>;

export function parseTacticDocumentV1(input: unknown) {
  return TacticDocumentV1Schema.parse(input);
}

export function tryParseTacticDocumentV1(
  input: unknown,
):
  | { success: true; data: TacticDocumentV1 }
  | { success: false; error: z.ZodError } {
  const r = TacticDocumentV1Schema.safeParse(input);
  if (r.success) return { success: true, data: r.data };
  return { success: false, error: r.error };
}
