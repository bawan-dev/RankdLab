import { expect, test } from "vitest";
import { formatTime } from "./time";
test("timestamps format minutes and clamp negatives", () => {
  expect(formatTime(125.9)).toBe("2:05");
  expect(formatTime(-2)).toBe("0:00");
});
