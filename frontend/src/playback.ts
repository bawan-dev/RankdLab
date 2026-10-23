import { Quaternion, Vector3 } from "three";
import type { Actor, Frame, Rotation, Vec3 } from "./types";

export function toWorld(p: Vec3): Vector3 {
  return new Vector3(p.x / 100, p.z / 100, p.y / 100);
}

export function tacticalFraming(points: Vec3[], aspect: number) {
  const world = points.map(toWorld);
  const center = world
    .reduce((a, p) => a.add(p), new Vector3())
    .divideScalar(Math.max(1, world.length));
  const radius = Math.max(12, ...world.map((p) => p.distanceTo(center)));
  const half = Math.min(
    (24 * Math.PI) / 180,
    Math.atan(Math.tan((24 * Math.PI) / 180) * Math.max(0.2, aspect)),
  );
  const distance = (radius / Math.sin(half)) * 1.12;
  return {
    target: center,
    position: center
      .clone()
      .add(new Vector3(0.55, 0.9, 0.65).normalize().multiplyScalar(distance)),
  };
}
export function toRotation(q: Rotation): Quaternion {
  return new Quaternion(q.x, q.z, q.y, -q.w).normalize();
}

export function frameIndex(frames: Frame[], time: number): number {
  let low = 0,
    high = frames.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (frames[mid].time <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function interpolate(
  a: Actor | null,
  b: Actor | null,
  alpha: number,
  continuous: boolean,
  span = 0,
) {
  if (!a) return null;
  const position = toWorld(a.position),
    rotation = toRotation(a.rotation);
  // Do not invent movement through missing samples, demolitions, goals or teleports.
  if (b && continuous && position.distanceTo(toWorld(b.position)) < 18) {
    const t = Math.max(0, Math.min(1, alpha));
    const end = toWorld(b.position);
    const linear = position.clone().lerp(end, t);
    // Recorded endpoint velocities give continuous motion between network samples.
    // Keep a linear fallback at impacts or inconsistent velocities; no extrapolation.
    if (a.velocity && b.velocity && span > 0 && span < 0.25) {
      const v0 = toWorld(a.velocity),
        v1 = toWorld(b.velocity);
      const chord = end.clone().sub(position);
      const limit = chord.length() * 3 + 0.01;
      const curveBudget = Math.max(0.02, chord.length() * 0.15);
      if (
        v0.distanceTo(v1) < 10 &&
        v0.length() * span <= limit &&
        v1.length() * span <= limit &&
        v0.clone().multiplyScalar(span).sub(chord).length() / 3 <=
          curveBudget &&
        v1.clone().multiplyScalar(span).sub(chord).length() / 3 <= curveBudget
      ) {
        const smooth = position
          .clone()
          .multiplyScalar(2 * t ** 3 - 3 * t ** 2 + 1)
          .addScaledVector(v0, (t ** 3 - 2 * t ** 2 + t) * span)
          .addScaledVector(end, -2 * t ** 3 + 3 * t ** 2)
          .addScaledVector(v1, (t ** 3 - t ** 2) * span);
        // Control-point bounds select one curve for the whole segment. Switching
        // to linear midway through a segment would itself introduce a visible jump.
        linear.copy(smooth);
      }
    }
    position.copy(linear);
    rotation.slerp(toRotation(b.rotation), t);
  }
  return { position, rotation, boost: a.boost };
}

// Random-access effects: seeking, pausing and playback speed all use replay time.
// Jump/double-jump/dodge component rising edges create a brief underbody burst.
export function replayThrust(
  frames: Frame[],
  index: number,
  playerId: string,
  time: number,
) {
  const frame = frames[index],
    actor = frame.players[playerId];
  if (!actor || time - frame.time >= 0.25) return { boost: false, jump: 0 };
  let jump = 0;
  for (let i = index; i > 0 && time - frames[i].time <= 0.18; i--) {
    const current = frames[i],
      previous = frames[i - 1];
    const a = current.players[playerId],
      b = previous.players[playerId];
    if (
      !a ||
      !b ||
      current.time - previous.time >= 0.25 ||
      current.state !== previous.state ||
      toWorld(a.position).distanceTo(toWorld(b.position)) >= 18
    )
      break;
    if (
      (["jump_active", "double_jump_active", "dodge_active"] as const).some(
        (key) => a[key] === true && b[key] === false,
      )
    ) {
      jump = Math.max(0, 1 - (time - current.time) / 0.18);
      break;
    }
  }
  return { boost: actor.boost_active === true, jump };
}

// Keep trajectory lines on recorded, continuous segments; never bridge a demolition,
// missing packet, goal reset or teleport with a fabricated line of movement.
export function recordedSegments(
  frames: Frame[],
  start: number,
  end: number,
  playerId?: string,
): Vec3[][] {
  const segments: Vec3[][] = [];
  let segment: Vec3[] = [],
    previous: Frame | null = null;
  for (const frame of frames) {
    if (frame.time < start) continue;
    if (frame.time > end) break;
    const actor = playerId ? frame.players[playerId] : frame.ball;
    const last = segment.at(-1);
    if (
      !actor ||
      (previous &&
        (frame.time - previous.time >= 0.25 ||
          frame.state !== previous.state)) ||
      (actor &&
        last &&
        Math.hypot(
          actor.position.x - last.x,
          actor.position.y - last.y,
          actor.position.z - last.z,
        ) >= 1800)
    ) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    if (actor) segment.push(actor.position);
    previous = frame;
  }
  if (segment.length > 1) segments.push(segment);
  return segments;
}

export type CoachingState = {
  phase: "watching" | "framing" | "review" | "context";
  activeId: string | null;
  reviewed: string[];
};
export function nextMoment(
  events: { id: string; time: number }[],
  state: CoachingState,
  from: number,
  to: number,
) {
  if (state.phase === "review" || state.phase === "framing") return null;
  if (state.phase === "context")
    return (
      events.find(
        (event) =>
          event.id === state.activeId && event.time >= from && event.time <= to,
      ) ?? null
    );
  return (
    events.find(
      (event) =>
        !state.reviewed.includes(event.id) &&
        event.time >= from &&
        event.time <= to,
    ) ?? null
  );
}
export function continueCoaching(state: CoachingState): CoachingState {
  return {
    phase: "watching",
    activeId: null,
    reviewed: state.activeId
      ? [...new Set([...state.reviewed, state.activeId])]
      : state.reviewed,
  };
}
