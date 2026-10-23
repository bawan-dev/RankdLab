import { describe, expect, test } from "vitest";
import {
  continueCoaching,
  frameIndex,
  interpolate,
  nextMoment,
  recordedSegments,
  tacticalFraming,
  replayThrust,
  toRotation,
  toWorld,
} from "./playback";
import type { Actor, Frame } from "./types";
import { PerspectiveCamera } from "three";
const actor = (x: number): Actor => ({
  position: { x, y: 200, z: 300 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  velocity: null,
  boost: 33,
});

test("velocity interpolation is bounded, matches endpoints and falls back at impacts", () => {
  const a = { ...actor(0), velocity: { x: 500, y: 0, z: 0 } };
  const b = { ...actor(75), velocity: { x: 1000, y: 0, z: 0 } };
  expect(interpolate(a, b, 0, true, 0.1)?.position.x).toBe(0);
  expect(interpolate(a, b, 1, true, 0.1)?.position.x).toBe(0.75);
  expect(interpolate(a, b, 0.5, true, 0.1)?.position.x).toBeCloseTo(0.3125);
  expect(
    interpolate(a, { ...b, velocity: { x: -2000, y: 0, z: 0 } }, 0.5, true, 0.1)
      ?.position.x,
  ).toBe(0.375);
  expect(interpolate(a, b, 0.5, false, 0.1)?.position.x).toBe(0);
  const fast = { ...actor(0), velocity: { x: 3000, y: 0, z: 0 } };
  for (const alpha of [0.1, 0.2, 0.4, 0.7, 0.9]) {
    expect(
      interpolate(
        fast,
        { ...fast, position: actor(100).position },
        alpha,
        true,
        0.1,
      )?.position.x,
    ).toBeCloseTo(alpha); // Inconsistent velocities select linear for the entire segment.
  }
});

test("thrust follows recorded actions and replay time, never altitude or boost amount", () => {
  const frames: Frame[] = Array.from({ length: 8 }, (_, i) => ({
    time: i * 0.05,
    source_time: i * 0.05,
    state: "Active",
    seconds_remaining: 300,
    ball: null,
    players: {
      a: {
        ...actor(i * 20),
        boost_active: i === 2,
        jump_active: i === 2,
        double_jump_active: i === 6,
        dodge_active: false,
      },
    },
  }));
  expect(replayThrust(frames, 0, "a", 0)).toEqual({ boost: false, jump: 0 });
  expect(replayThrust(frames, 2, "a", 0.1)).toEqual({ boost: true, jump: 1 });
  expect(replayThrust(frames, 3, "a", 0.15).jump).toBeCloseTo(1 - 0.05 / 0.18);
  expect(replayThrust(frames, 6, "a", 0.3).jump).toBeCloseTo(1);
  expect(replayThrust(frames, 2, "a", 0.1)).toEqual({ boost: true, jump: 1 });
  frames[1].players.a = null;
  expect(replayThrust(frames, 2, "a", 0.1).jump).toBe(0);
  frames[2].players.a = { ...actor(40), boost: 100 };
  expect(replayThrust(frames, 2, "a", 0.1)).toEqual({ boost: false, jump: 0 });
  expect(replayThrust(frames, 7, "a", 5)).toEqual({ boost: false, jump: 0 });
});

test("tactical camera includes relevant positions in portrait and landscape", () => {
  const points = [
    { x: -3500, y: -4500, z: 20 },
    { x: 3200, y: 3800, z: 500 },
    { x: 0, y: 0, z: 92 },
  ];
  for (const aspect of [0.7, 1.8]) {
    const { target, position } = tacticalFraming(points, aspect);
    const camera = new PerspectiveCamera(48, aspect, 0.1, 600);
    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    for (const point of points) {
      const projected = toWorld(point).project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
      expect(Math.abs(projected.y)).toBeLessThan(1);
    }
  }
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
