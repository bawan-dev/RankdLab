import { Quaternion, Vector3 } from "three";
import type { Actor, Frame, Rotation, Vec3 } from "./types";

export function toWorld(p: Vec3): Vector3 {
  return new Vector3(p.x / 100, p.z / 100, p.y / 100);
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
