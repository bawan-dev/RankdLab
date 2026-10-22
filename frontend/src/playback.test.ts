import { describe, expect, test } from "vitest";
import {
  continueCoaching,
  frameIndex,
  interpolate,
  nextMoment,
  recordedSegments,
  toRotation,
  toWorld,
} from "./playback";
import type { Actor, Frame } from "./types";
const actor = (x: number): Actor => ({
  position: { x, y: 200, z: 300 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  velocity: null,
  boost: 33,
});

test("recorded trajectories split missing samples, resets, gaps and teleports", () => {
  const frames: Frame[] = [
    0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1, 1.1, 1.2, 1.3,
  ].map((time, i) => ({
    time,
    source_time: time,
    seconds_remaining: null,
    state: "Active",
    ball: actor(i * 10),
    players: { a: actor(i * 10) },
  }));
  frames[2].players.a = null;
  frames[5].state = "PostGoalScored";
  frames[6].state = "PostGoalScored";
  frames[10].players.a = actor(5000);
  frames[11].players.a = actor(5010);
  const paths = recordedSegments(frames, 0, 2, "a");
  expect(paths.map((p) => p.map((v) => v.x))).toEqual([
    [0, 10],
    [30, 40],
    [50, 60],
    [80, 90],
    [5000, 5010],
  ]);
  expect(
    recordedSegments(frames, 0, 0.1).map((p) => p.map((v) => v.x)),
  ).toEqual([[0, 10]]);
});
describe("native replay adapter", () => {
  test("maps Unreal Z-up coordinates and rotations", () => {
    expect(toWorld({ x: 100, y: -200, z: 300 }).toArray()).toEqual([1, 3, -2]);
    const forward = toWorld({ x: 100, y: 0, z: 0 }).applyQuaternion(
      toRotation({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 }),
    );
    expect(forward.z).toBeCloseTo(1);
  });
  test("finds last frame at timestamp including duplicate timestamps", () => {
    const frames = [0, 1.1, 1.1, 3].map((time) => ({ time }) as Frame);
    expect(frameIndex(frames, 1.1)).toBe(2);
    expect(frameIndex(frames, -1)).toBe(0);
    expect(frameIndex(frames, 100)).toBe(3);
  });
  test("interpolates recorded movement and preserves gaps and teleports", () => {
    expect(interpolate(actor(0), actor(100), 0.5, true)?.position.x).toBe(0.5);
    expect(interpolate(actor(0), actor(5000), 0.5, true)?.position.x).toBe(0);
    expect(interpolate(actor(0), actor(100), 0.5, false)?.position.x).toBe(0);
    expect(interpolate(null, actor(100), 0.5, true)).toBeNull();
  });
});
test("coaching pauses once and continues past reviewed moments", () => {
  const events = [
    { id: "a", time: 5 },
    { id: "b", time: 6 },
  ];
  const state = { phase: "watching" as const, activeId: null, reviewed: [] };
  expect(nextMoment(events, state, 4, 7)?.id).toBe("a");
  const reviewed = continueCoaching({
    ...state,
    phase: "review",
    activeId: "a",
  });
  expect(nextMoment(events, reviewed, 4, 7)?.id).toBe("b");
  expect(nextMoment(events, { ...state, phase: "review" }, 4, 7)).toBeNull();
});

test("context replay returns to the chosen event even after it was reviewed", () => {
  const events = [{ id: "a", time: 5 }];
  expect(
    nextMoment(
      events,
      { phase: "context", activeId: "a", reviewed: ["a"] },
      4,
      6,
    )?.id,
  ).toBe("a");
  expect(
    nextMoment(events, { phase: "framing", activeId: "a", reviewed: [] }, 4, 6),
  ).toBeNull();
});
