import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import process from "node:process";
import ts from "typescript";

const COLLISION_DISTANCE = 0.005;
const MAX_SCREEN_DURATION_MS = 900;
const MAX_SCREENER_MOVEMENT_METERS = 0.25;
const MAX_SCREEN_CONTACT_METERS = 0.95;
const MAX_HANDOFF_DISTANCE_METERS = 0.8;
const MIN_PASS_CLEARANCE_METERS = 0.35;
const PASS_FLY_MS = 400;
const PASS_CHECK_MIN_PROGRESS = 0.25;
const PASS_CHECK_MAX_PROGRESS = 0.75;
const SCREEN_SAMPLE_STEP_MS = 25;

const failures = [];
const failureKeys = new Set();

function fail(templateId, rule, message) {
  const key = `${templateId}\u0000${rule}\u0000${message}`;
  if (failureKeys.has(key)) return;
  failureKeys.add(key);
  failures.push({ templateId, rule, message });
}

function displayTemplateId(template, index) {
  if (typeof template?.id === "string" && template.id.trim()) return template.id;
  return `template[${index}]`;
}

function formatPath(path) {
  return path.reduce(
    (out, part) =>
      typeof part === "number" ? `${out}[${part}]` : out ? `${out}.${part}` : part,
    "",
  );
}

function isFinitePoint(pose) {
  return Number.isFinite(pose?.x) && Number.isFinite(pose?.y);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function courtScale(document) {
  const length = document?.meta?.court?.sizeMeters?.length;
  const width = document?.meta?.court?.sizeMeters?.width;
  return {
    x: Number.isFinite(length) && length > 0 ? length : document?.meta?.court?.preset === "full" ? 28 : 14,
    y: Number.isFinite(width) && width > 0 ? width : 15,
  };
}

function metricDistance(a, b, scale) {
  return Math.hypot((a.x - b.x) * scale.x, (a.y - b.y) * scale.y);
}

function quadraticBezier(a, control, b, progress) {
  const inverse = 1 - progress;
  return inverse * inverse * a + 2 * inverse * progress * control + progress * progress * b;
}

/** Mirrors the playback interpolator, including control points stored on the destination pose. */
function samplePose(keyframes, actorId, tMs) {
  if (!keyframes.length) return undefined;

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (tMs <= first.t) return first.poses?.[actorId];
  if (tMs >= last.t) return last.poses?.[actorId];

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const fromFrame = keyframes[index];
    const toFrame = keyframes[index + 1];
    if (!(fromFrame.t <= tMs && tMs < toFrame.t)) continue;

    const from = fromFrame.poses?.[actorId];
    const to = toFrame.poses?.[actorId];
    if (!isFinitePoint(from) || !isFinitePoint(to)) return undefined;

    const progress = (tMs - fromFrame.t) / (toFrame.t - fromFrame.t);
    const hasControlPoint = Number.isFinite(to.cpx) && Number.isFinite(to.cpy);
    return {
      x: hasControlPoint
        ? quadraticBezier(from.x, to.cpx, to.x, progress)
        : from.x + (to.x - from.x) * progress,
      y: hasControlPoint
        ? quadraticBezier(from.y, to.cpy, to.y, progress)
        : from.y + (to.y - from.y) * progress,
    };
  }

  return undefined;
}

function validateTemplateIdentity(templates) {
  const seenIds = new Map();

  templates.forEach((template, index) => {
    const templateId = displayTemplateId(template, index);
    if (typeof template?.id !== "string" || !template.id.trim()) {
      fail(templateId, "template-id", "id must be a nonempty string");
      return;
    }

    const previousIndex = seenIds.get(template.id);
    if (previousIndex !== undefined) {
      fail(
        templateId,
        "template-id",
        `duplicate id (also used by template[${previousIndex}])`,
      );
      return;
    }
    seenIds.set(template.id, index);
  });
}

function validateSchema(templateId, document, schema) {
  const result = schema.safeParse(document);
  if (result.success) return;

  result.error.issues.forEach((issue) => {
    const path = formatPath(issue.path);
    fail(templateId, "shared-schema", `${path || "document"}: ${issue.message}`);
  });
}

function validateVersionAndCategory(templateId, document) {
  if (document?.schemaVersion !== 2) {
    fail(templateId, "schema-version", `expected 2, received ${String(document?.schemaVersion)}`);
  }

  if (typeof document?.meta?.category !== "string" || !document.meta.category.trim()) {
    fail(templateId, "category", "meta.category must be a nonempty string");
  }
}

function validateActorIds(templateId, actors) {
  const seenIds = new Map();

  actors.forEach((actor, index) => {
    if (typeof actor?.id !== "string" || !actor.id.trim()) {
      fail(templateId, "actor-id", `actors[${index}].id must be a nonempty string`);
      return;
    }

    const previousIndex = seenIds.get(actor.id);
    if (previousIndex !== undefined) {
      fail(
        templateId,
        "actor-id",
        `actors[${index}].id duplicates actors[${previousIndex}].id (${actor.id})`,
      );
      return;
    }
    seenIds.set(actor.id, index);
  });
}

function validateTimeline(templateId, document) {
  const keyframes = Array.isArray(document?.keyframes) ? document.keyframes : [];
  const events = Array.isArray(document?.events) ? document.events : [];
  const durationMs = document?.meta?.durationMs;

  if (!Number.isInteger(durationMs) || durationMs < 0) {
    fail(templateId, "timeline", "meta.durationMs must be a nonnegative integer");
  }

  let previousKeyframeTime = -1;
  keyframes.forEach((keyframe, index) => {
    if (!Number.isInteger(keyframe?.t) || keyframe.t < 0) {
      fail(templateId, "timeline", `keyframes[${index}].t must be a nonnegative integer`);
      return;
    }
    if (keyframe.t <= previousKeyframeTime) {
      fail(templateId, "timeline", `keyframes[${index}].t must be strictly increasing`);
    }
    if (Number.isInteger(durationMs) && keyframe.t > durationMs) {
      fail(
        templateId,
        "timeline",
        `keyframes[${index}].t (${keyframe.t}) exceeds durationMs (${durationMs})`,
      );
    }
    previousKeyframeTime = keyframe.t;
  });

  let previousEventTime = -1;
  events.forEach((event, index) => {
    if (!Number.isInteger(event?.t) || event.t < 0) {
      fail(templateId, "timeline", `events[${index}].t must be a nonnegative integer`);
      return;
    }
    if (event.t < previousEventTime) {
      fail(
        templateId,
        "timeline",
        `events[${index}].t (${event.t}) is earlier than the previous event (${previousEventTime})`,
      );
    }
    if (Number.isInteger(durationMs) && event.t > durationMs) {
      fail(
        templateId,
        "timeline",
        `events[${index}].t (${event.t}) exceeds durationMs (${durationMs})`,
      );
    }
    previousEventTime = event.t;
  });
}

function validatePlayerPoses(templateId, actors, keyframes) {
  // A ball's playback position is derived from heldBy and ownership events.
  const playerIds = actors.filter((actor) => actor?.type === "player").map((actor) => actor.id);

  keyframes.forEach((keyframe, keyframeIndex) => {
    playerIds.forEach((playerId) => {
      if (!isFinitePoint(keyframe?.poses?.[playerId])) {
        fail(
          templateId,
          "complete-poses",
          `keyframes[${keyframeIndex}] at ${String(keyframe?.t)}ms is missing player ${playerId}`,
        );
      }
    });

    for (let left = 0; left < playerIds.length; left += 1) {
      const leftId = playerIds[left];
      const leftPose = keyframe?.poses?.[leftId];
      if (!isFinitePoint(leftPose)) continue;

      for (let right = left + 1; right < playerIds.length; right += 1) {
        const rightId = playerIds[right];
        const rightPose = keyframe?.poses?.[rightId];
        if (!isFinitePoint(rightPose)) continue;

        const centerDistance = distance(leftPose, rightPose);
        if (centerDistance >= COLLISION_DISTANCE) continue;
        fail(
          templateId,
          "player-collision",
          `keyframes[${keyframeIndex}] at ${String(keyframe?.t)}ms: ${leftId}/${rightId} centers are ${centerDistance.toFixed(4)} apart`,
        );
      }
    }
  });
}

function validateOwnership(templateId, actors, events) {
  const players = new Set(
    actors.filter((actor) => actor?.type === "player" && typeof actor.id === "string").map((actor) => actor.id),
  );
  const balls = actors.filter((actor) => actor?.type === "ball");

  if (balls.length !== 1) {
    fail(templateId, "ball-ownership", `expected exactly one ball actor, received ${balls.length}`);
  }

  let holder = balls[0]?.heldBy;
  if (holder !== undefined && !players.has(holder)) {
    fail(templateId, "ball-ownership", `initial heldBy references unknown player ${String(holder)}`);
    holder = undefined;
  }

  events.forEach((event, index) => {
    if (!event || typeof event.kind !== "string") return;
    const eventLabel = `events[${index}] ${event.kind} at ${String(event.t)}ms`;

    if (event.kind === "pass" || event.kind === "handoff") {
      const fromIsValid = typeof event.from === "string" && players.has(event.from);
      const toIsValid = typeof event.to === "string" && players.has(event.to);
      if (!fromIsValid) {
        fail(templateId, "ball-ownership", `${eventLabel} has invalid from ${String(event.from)}`);
      }
      if (!toIsValid) {
        fail(templateId, "ball-ownership", `${eventLabel} has invalid to ${String(event.to)}`);
      }
      if (fromIsValid && toIsValid && event.from === event.to) {
        fail(templateId, "ball-ownership", `${eventLabel} cannot transfer to the same player`);
      }
      if (fromIsValid && holder !== event.from) {
        fail(
          templateId,
          "ball-ownership",
          `${eventLabel} starts from ${event.from}, but current holder is ${holder ?? "none"}`,
        );
      }
      if (toIsValid) holder = event.to;
      return;
    }

    if (event.kind === "possess") {
      if (typeof event.to !== "string" || !players.has(event.to)) {
        fail(templateId, "ball-ownership", `${eventLabel} has invalid to ${String(event.to)}`);
        return;
      }
      holder = event.to;
      return;
    }

    if (event.kind === "possess_end") {
      if (event.from !== undefined && !players.has(event.from)) {
        fail(templateId, "ball-ownership", `${eventLabel} has invalid from ${String(event.from)}`);
      }
      if (event.from !== undefined && holder !== undefined && event.from !== holder) {
        fail(
          templateId,
          "ball-ownership",
          `${eventLabel} names ${event.from}, but current holder is ${holder}`,
        );
      }
      holder = undefined;
      return;
    }

    if (event.kind === "finish_options") {
      if (typeof event.from !== "string" || !players.has(event.from)) {
        fail(templateId, "ball-ownership", `${eventLabel} has invalid from ${String(event.from)}`);
      } else if (holder !== event.from) {
        fail(
          templateId,
          "ball-ownership",
          `${eventLabel} belongs to ${event.from}, but current holder is ${holder ?? "none"}`,
        );
      }
    }
  });
}

function validateScreenMovement(templateId, keyframes, screenerId, start, end, scale) {
  const sampleTimes = new Set([start.t, end.t]);
  keyframes.forEach((keyframe) => {
    if (keyframe.t > start.t && keyframe.t < end.t) sampleTimes.add(keyframe.t);
  });
  for (let t = start.t + SCREEN_SAMPLE_STEP_MS; t < end.t; t += SCREEN_SAMPLE_STEP_MS) {
    sampleTimes.add(t);
  }

  const startPose = samplePose(keyframes, screenerId, start.t);
  if (!isFinitePoint(startPose)) {
    fail(
      templateId,
      "screen-interval",
      `cannot sample screener ${screenerId} at screen start ${start.t}ms`,
    );
    return;
  }

  let maximumMovement = 0;
  let maximumMovementTime = start.t;
  [...sampleTimes].sort((a, b) => a - b).forEach((sampleTime) => {
    const pose = samplePose(keyframes, screenerId, sampleTime);
    if (!isFinitePoint(pose)) {
      fail(
        templateId,
        "screen-interval",
        `cannot sample screener ${screenerId} at ${sampleTime}ms`,
      );
      return;
    }
    const movement = metricDistance(startPose, pose, scale);
    if (movement > maximumMovement) {
      maximumMovement = movement;
      maximumMovementTime = sampleTime;
    }
  });

  if (maximumMovement > MAX_SCREENER_MOVEMENT_METERS + Number.EPSILON) {
    fail(
      templateId,
      "screen-interval",
      `${screenerId} moves ${maximumMovement.toFixed(2)}m between ${start.t}ms and ${maximumMovementTime}ms (max ${MAX_SCREENER_MOVEMENT_METERS.toFixed(2)}m)`,
    );
  }
}

function validateScreenContact(templateId, actors, keyframes, start, end, scale) {
  const target = actors.find((actor) => actor?.type === "player" && actor.id === start.to);
  if (!target || target.team !== "offense") {
    fail(templateId, "screen-contact", `screen at ${start.t}ms must name an offensive target in to`);
    return;
  }
  const matchedDefender = actors.find(
    (actor) => actor?.type === "player" && actor.team === "defense" && actor.number === target.number,
  );
  if (!matchedDefender) {
    fail(
      templateId,
      "screen-contact",
      `screen target ${target.id} at ${start.t}ms has no same-number defender to validate`,
    );
    return;
  }

  const sampleTimes = new Set([start.t, end.t]);
  for (let t = start.t + SCREEN_SAMPLE_STEP_MS; t < end.t; t += SCREEN_SAMPLE_STEP_MS) {
    sampleTimes.add(t);
  }
  let targetDistance = Number.POSITIVE_INFINITY;
  let defenderDistance = Number.POSITIVE_INFINITY;
  sampleTimes.forEach((sampleTime) => {
    const screener = samplePose(keyframes, start.from, sampleTime);
    const cutter = samplePose(keyframes, target.id, sampleTime);
    const defender = samplePose(keyframes, matchedDefender.id, sampleTime);
    if (!isFinitePoint(screener) || !isFinitePoint(cutter) || !isFinitePoint(defender)) return;
    targetDistance = Math.min(targetDistance, metricDistance(screener, cutter, scale));
    defenderDistance = Math.min(defenderDistance, metricDistance(screener, defender, scale));
  });

  if (targetDistance > MAX_SCREEN_CONTACT_METERS) {
    fail(
      templateId,
      "screen-contact",
      `${start.from} never comes within ${MAX_SCREEN_CONTACT_METERS.toFixed(2)}m of target ${target.id} (${targetDistance.toFixed(2)}m)`,
    );
  }
  if (defenderDistance > MAX_SCREEN_CONTACT_METERS) {
    fail(
      templateId,
      "screen-contact",
      `${start.from} never engages ${matchedDefender.id} for target ${target.id} (${defenderDistance.toFixed(2)}m)`,
    );
  }
}

function validateScreens(templateId, document, actors, keyframes, events) {
  const playerRows = actors.filter(
    (actor) => actor?.type === "player" && typeof actor.id === "string",
  );
  const players = new Set(playerRows.map((actor) => actor.id));
  const scale = courtScale(document);
  const activeScreens = new Map();

  events.forEach((event, index) => {
    if (event?.kind !== "screen" && event?.kind !== "screen_end") return;
    const screenerId = event.from;
    if (typeof screenerId !== "string" || !players.has(screenerId)) return;

    if (event.kind === "screen") {
      const active = activeScreens.get(screenerId);
      if (active) {
        fail(
          templateId,
          "screen-interval",
          `events[${index}] starts a second screen for ${screenerId} before the ${active.t}ms screen ends`,
        );
        return;
      }
      activeScreens.set(screenerId, { ...event, index });
      return;
    }

    const start = activeScreens.get(screenerId);
    if (!start) {
      fail(
        templateId,
        "screen-interval",
        `events[${index}] ends a screen for ${screenerId} without a paired start`,
      );
      return;
    }
    activeScreens.delete(screenerId);

    const intervalMs = event.t - start.t;
    if (intervalMs <= 0 || intervalMs > MAX_SCREEN_DURATION_MS) {
      fail(
        templateId,
        "screen-interval",
        `${screenerId} screen from ${start.t}ms to ${event.t}ms lasts ${intervalMs}ms (must be 1-${MAX_SCREEN_DURATION_MS}ms)`,
      );
    }
    if (intervalMs > 0) {
      validateScreenMovement(templateId, keyframes, screenerId, start, event, scale);
      validateScreenContact(templateId, actors, keyframes, start, event, scale);
    }
  });

  activeScreens.forEach((start, screenerId) => {
    fail(
      templateId,
      "screen-interval",
      `${screenerId} screen at ${start.t}ms has no paired screen_end event`,
    );
  });
}

function passFlyMs(keyframes, passT) {
  const times = keyframes.map((keyframe) => keyframe.t).sort((a, b) => a - b);
  const previous = times.filter((time) => time < passT).at(-1);
  if (previous !== undefined) return Math.min(PASS_FLY_MS, passT - previous);
  const next = times.find((time) => time > passT);
  return next === undefined ? PASS_FLY_MS : Math.min(PASS_FLY_MS, next - passT);
}

function validatePassLanes(templateId, document, actors, keyframes, events) {
  const defenders = actors.filter(
    (actor) => actor?.type === "player" && actor.team === "defense" && typeof actor.id === "string",
  );
  const scale = courtScale(document);

  events.forEach((event, index) => {
    if (event?.kind !== "pass" || typeof event.from !== "string" || typeof event.to !== "string") return;
    const flightMs = passFlyMs(keyframes, event.t);
    const flightStart = Math.max(0, event.t - flightMs);
    const from = samplePose(keyframes, event.from, flightStart);
    const to = samplePose(keyframes, event.to, event.t);
    if (!isFinitePoint(from) || !isFinitePoint(to) || flightMs <= 0) return;

    let closest = { distance: Number.POSITIVE_INFINITY, defenderId: "", t: flightStart };
    for (let t = flightStart; t <= event.t; t += SCREEN_SAMPLE_STEP_MS) {
      const progress = (t - flightStart) / flightMs;
      if (progress < PASS_CHECK_MIN_PROGRESS || progress > PASS_CHECK_MAX_PROGRESS) continue;
      const ball = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      };
      defenders.forEach((defender) => {
        const pose = samplePose(keyframes, defender.id, t);
        if (!isFinitePoint(pose)) return;
        const clearance = metricDistance(ball, pose, scale);
        if (clearance < closest.distance) closest = { distance: clearance, defenderId: defender.id, t };
      });
    }

    if (closest.distance < MIN_PASS_CLEARANCE_METERS) {
      fail(
        templateId,
        "pass-lane",
        `events[${index}] ${event.from}->${event.to} passes ${closest.distance.toFixed(2)}m from ${closest.defenderId} at ${closest.t}ms`,
      );
    }
  });
}

function validateActions(templateId, document, actors, keyframes, events) {
  const players = new Map(
    actors.filter((actor) => actor?.type === "player").map((actor) => [actor.id, actor]),
  );
  const scale = courtScale(document);
  const offensiveKinds = new Set(["pass", "handoff", "screen", "screen_end", "cut", "finish_options"]);

  events.forEach((event, index) => {
    if (!offensiveKinds.has(event?.kind)) return;
    const from = players.get(event.from);
    if (from && from.team !== "offense") {
      fail(templateId, "offensive-action", `events[${index}] ${event.kind} starts from defender ${from.id}`);
    }
    if ((event.kind === "pass" || event.kind === "handoff" || event.kind === "screen") && event.to) {
      const to = players.get(event.to);
      if (to && to.team !== "offense") {
        fail(templateId, "offensive-action", `events[${index}] ${event.kind} targets defender ${to.id}`);
      }
    }
    if (event.kind !== "handoff" || !from || !event.to) return;
    const receiver = players.get(event.to);
    const fromPose = samplePose(keyframes, from.id, event.t);
    const toPose = samplePose(keyframes, event.to, event.t);
    if (!receiver || !isFinitePoint(fromPose) || !isFinitePoint(toPose)) return;
    const handoffDistance = metricDistance(fromPose, toPose, scale);
    if (handoffDistance > MAX_HANDOFF_DISTANCE_METERS) {
      fail(
        templateId,
        "handoff-distance",
        `events[${index}] ${from.id}->${receiver.id} is ${handoffDistance.toFixed(2)}m apart (max ${MAX_HANDOFF_DISTANCE_METERS.toFixed(2)}m)`,
      );
    }
  });
}

function validateTeachingMetadata(templateId, template) {
  const durationMs = template?.document?.meta?.durationMs;
  const previewAtMs = template?.coaching?.previewAtMs;
  if (!Number.isFinite(previewAtMs) || previewAtMs < 0 || previewAtMs > durationMs) {
    fail(templateId, "coaching", `previewAtMs must be within 0-${String(durationMs)}ms`);
  }
  if (!Array.isArray(template?.coaching?.reads) || template.coaching.reads.length < 2) {
    fail(templateId, "coaching", "at least two ordered coaching reads are required");
  }

  const events = Array.isArray(template?.document?.events) ? template.document.events : [];
  Object.entries(template?.eventCopyZh ?? {}).forEach(([rawIndex, copy]) => {
    const index = Number(rawIndex);
    const event = events[index];
    if (!Number.isInteger(index) || !event) {
      fail(templateId, "localized-teaching", `eventCopyZh references missing event index ${rawIndex}`);
      return;
    }
    if (copy?.optionLabels) {
      const options = Array.isArray(event.options) ? event.options : [];
      if (copy.optionLabels.length !== options.length) {
        fail(
          templateId,
          "localized-teaching",
          `eventCopyZh[${rawIndex}] has ${copy.optionLabels.length} option labels for ${options.length} options`,
        );
      }
    }
  });
}

async function loadTemplates() {
  const sourceUrl = new URL("../src/tactic/templates.ts", import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, {
    fileName: sourceUrl.pathname,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const syntaxErrors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (syntaxErrors.length) {
    const host = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    };
    throw new Error(ts.formatDiagnostics(syntaxErrors, host));
  }

  const sourceDataUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`;
  const module = await import(sourceDataUrl);
  if (!Array.isArray(module.TEMPLATES)) {
    throw new Error("templates.ts does not export a TEMPLATES array");
  }
  return module.TEMPLATES;
}

async function main() {
  const [{ TacticDocumentV1Schema }, templates] = await Promise.all([
    import(new URL("../../../packages/shared/dist/index.js", import.meta.url)),
    loadTemplates(),
  ]);

  validateTemplateIdentity(templates);
  templates.forEach((template, index) => {
    const templateId = displayTemplateId(template, index);
    const document = template?.document;
    const actors = Array.isArray(document?.actors) ? document.actors : [];
    const keyframes = Array.isArray(document?.keyframes) ? document.keyframes : [];
    const events = Array.isArray(document?.events) ? document.events : [];

    validateSchema(templateId, document, TacticDocumentV1Schema);
    validateVersionAndCategory(templateId, document);
    validateActorIds(templateId, actors);
    validateTimeline(templateId, document);
    validatePlayerPoses(templateId, actors, keyframes);
    validateOwnership(templateId, actors, events);
    validateActions(templateId, document, actors, keyframes, events);
    validatePassLanes(templateId, document, actors, keyframes, events);
    validateScreens(templateId, document, actors, keyframes, events);
    validateTeachingMetadata(templateId, template);
  });

  if (failures.length) {
    console.error(`Template validation failed with ${failures.length} issue(s):`);
    failures.forEach(({ templateId, rule, message }) => {
      console.error(`- [${templateId}] ${rule}: ${message}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${templates.length} built-in template(s): schema and semantics OK.`);
}

main().catch((error) => {
  console.error("Template validation could not run:");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
