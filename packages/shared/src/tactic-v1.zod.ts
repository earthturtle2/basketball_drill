import { z } from "zod";

const vec2d = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  facingDeg: z.number().optional(),
  cpx: z.number().optional(),
  cpy: z.number().optional(),
});

const keyframe = z.object({
  t: z.number().int().min(0),
  poses: z.record(z.string().min(1), vec2d),
});

const finishOption = z
  .object({
    kind: z.enum(["shot", "pass"]),
    label: z.string().max(120).optional(),
    to: z.string().min(1).optional(),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
    priority: z.string().max(64).optional(),
    trigger: z.string().max(280).optional(),
  })
  .passthrough();

const event = z
  .object({
    t: z.number().int().min(0),
    kind: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    note: z.string().optional(),
    angle: z.number().optional(),
    /** v2 teaching semantics; optional so v1 documents stay valid. */
    teaching: z
      .object({
        concept: z.enum(["cut", "handoff", "screen", "spacing", "pass", "finish", "defense"]).optional(),
        explanation: z.string().max(1200).optional(),
      })
      .passthrough()
      .optional(),
    cut: z.enum(["basket", "curl", "flare", "backdoor", "pop", "lift", "replace", "split", "flash"]).optional(),
    handoff: z.enum(["dho", "pitch", "handoff_fake", "keep"]).optional(),
    screenSubtype: z
      .enum(["ball", "down", "pin_down", "flare", "back", "cross", "ram", "ghost", "drag", "rescreen", "split"])
      .optional(),
    screen_subtype: z
      .enum(["ball", "down", "pin_down", "flare", "back", "cross", "ram", "ghost", "drag", "rescreen", "split"])
      .optional(),
    coverage: z
      .enum(["drop", "show", "hedge", "switch", "ice", "under", "over", "trap", "zone", "help_recover"])
      .optional(),
    readTrigger: z.string().max(280).optional(),
    read_trigger: z.string().max(280).optional(),
    playerTask: z.string().max(280).optional(),
    player_task: z.string().max(280).optional(),
    commonMistake: z.string().max(280).optional(),
    common_mistake: z.string().max(280).optional(),
    durationMs: z.number().int().min(500).max(6000).optional(),
    options: z.array(finishOption).min(1).max(8).optional(),
  })
  .passthrough();

const actor = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("player"),
    team: z.enum(["offense", "defense"]),
    rosterPlayerId: z.string().min(1).optional(),
    number: z.number().int().min(0).max(99),
    label: z.string(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("ball"),
    heldBy: z.string().optional(),
  }),
]);

function addCustomIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

export const TacticDocumentV1Schema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    meta: z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        category: z.string().max(64).optional(),
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
    actors: z.array(actor).max(32),
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
  .strict()
  .superRefine((doc, ctx) => {
    const actorIds = new Set<string>();
    const playerIds = new Set<string>();
    const teamCounts = { offense: 0, defense: 0 };
    let ballCount = 0;

    doc.actors.forEach((a, i) => {
      if (actorIds.has(a.id)) {
        addCustomIssue(ctx, ["actors", i, "id"], `actor id 重复: ${a.id}`);
      }
      actorIds.add(a.id);
      if (a.type === "player") {
        playerIds.add(a.id);
        teamCounts[a.team] += 1;
      } else {
        ballCount += 1;
      }
    });

    if (teamCounts.offense > 5) {
      addCustomIssue(ctx, ["actors"], "进攻球员不能超过 5 人");
    }
    if (teamCounts.defense > 5) {
      addCustomIssue(ctx, ["actors"], "防守球员不能超过 5 人");
    }
    if (ballCount > 1) {
      addCustomIssue(ctx, ["actors"], "ball actor 只能有一个");
    }

    doc.actors.forEach((a, i) => {
      if (a.type === "ball" && a.heldBy && !playerIds.has(a.heldBy)) {
        addCustomIssue(ctx, ["actors", i, "heldBy"], `持球人不存在: ${a.heldBy}`);
      }
    });

    const durationMs = doc.meta.durationMs;
    let prevT = -1;
    doc.keyframes.forEach((kf, i) => {
      if (kf.t <= prevT) {
        addCustomIssue(ctx, ["keyframes", i, "t"], "关键帧时间必须严格递增");
      }
      prevT = kf.t;
      if (durationMs !== undefined && kf.t > durationMs) {
        addCustomIssue(ctx, ["keyframes", i, "t"], "关键帧时间不能超过 durationMs");
      }
      Object.keys(kf.poses).forEach((actorId) => {
        if (!actorIds.has(actorId)) {
          addCustomIssue(ctx, ["keyframes", i, "poses", actorId], `pose 引用了不存在的 actor: ${actorId}`);
        }
      });
    });

    const lastKeyframeT = doc.keyframes.at(-1)?.t ?? 0;
    const timelineEnd = durationMs ?? lastKeyframeT;
    const requirePlayerRef = (
      value: string | undefined,
      path: Array<string | number>,
      label: string,
    ) => {
      if (!value) {
        addCustomIssue(ctx, path, `${label} 不能为空`);
        return;
      }
      if (!playerIds.has(value)) {
        addCustomIssue(ctx, path, `${label} 不存在: ${value}`);
      }
    };

    doc.events?.forEach((ev, i) => {
      if (ev.t > timelineEnd) {
        addCustomIssue(ctx, ["events", i, "t"], "事件时间不能超过战术时长");
      }

      if (ev.kind === "pass") {
        requirePlayerRef(ev.from, ["events", i, "from"], "传球发起人");
        requirePlayerRef(ev.to, ["events", i, "to"], "传球接收人");
        return;
      }

      if (ev.kind === "possess") {
        requirePlayerRef(ev.to, ["events", i, "to"], "持球人");
        return;
      }

      if (ev.kind === "screen" || ev.kind === "screen_end") {
        requirePlayerRef(ev.from, ["events", i, "from"], "掩护球员");
        return;
      }

      if (ev.kind === "cut") {
        requirePlayerRef(ev.from, ["events", i, "from"], "空切球员");
        return;
      }

      if (ev.kind === "handoff") {
        requirePlayerRef(ev.from, ["events", i, "from"], "手递手发起人");
        requirePlayerRef(ev.to, ["events", i, "to"], "手递手接球人");
        return;
      }

      if (ev.kind === "finish_options") {
        requirePlayerRef(ev.from, ["events", i, "from"], "终结阅读发起人");
        if (!ev.options?.length) {
          addCustomIssue(ctx, ["events", i, "options"], "终结阅读至少需要一个选项");
          return;
        }
        ev.options.forEach((option, optionIndex) => {
          if (option.kind === "pass") {
            requirePlayerRef(option.to, ["events", i, "options", optionIndex, "to"], "终结阅读接球人");
          } else if (option.x === undefined || option.y === undefined) {
            addCustomIssue(
              ctx,
              ["events", i, "options", optionIndex],
              "投篮选项必须提供 x 和 y 落点",
            );
          }
        });
        return;
      }

      if (ev.from && !playerIds.has(ev.from)) {
        addCustomIssue(ctx, ["events", i, "from"], `from 不存在: ${ev.from}`);
      }
      if (ev.to && !playerIds.has(ev.to)) {
        addCustomIssue(ctx, ["events", i, "to"], `to 不存在: ${ev.to}`);
      }
    });
  });

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
