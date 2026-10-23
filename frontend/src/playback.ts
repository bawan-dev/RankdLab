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
) {
  if (!a) return null;
  const position = toWorld(a.position),
    rotation = toRotation(a.rotation);
  // Do not invent movement through missing samples, demolitions, goals or teleports.
  if (b && continuous && position.distanceTo(toWorld(b.position)) < 18) {
    position.lerp(toWorld(b.position), alpha);
    rotation.slerp(toRotation(b.rotation), alpha);
  }
  return { position, rotation, boost: a.boost };
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
