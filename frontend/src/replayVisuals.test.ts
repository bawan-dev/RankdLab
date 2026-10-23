import { expect, test } from "vitest";
import { Vector3 } from "three";
import { carBody } from "./carBodies";
import { buildCar, animateThrusters } from "./replayVisuals";

test("replay body ID selects Octane and Fennec independently of their shared hitbox", () => {
  expect(carBody({ car_body_id: 23, car_hitbox_family: "Octane" }).model).toBe(
    "octane",
  );
  expect(
    carBody({ car_body_id: 4284, car_hitbox_family: "Octane" }).model,
  ).toBe("fennec");
  expect(carBody({ car_body_id: 999999, car_hitbox_family: "Octane" })).toEqual(
    { name: "Body #999999", model: "generic" },
  );
  expect(carBody({}).name).toBe("Body unavailable");
  const octane = buildCar("blue", "octane"),
    fennec = buildCar("blue", "fennec");
  expect(octane.userData.bodyModel).toBe("octane");
  expect(fennec.userData.bodyModel).toBe("fennec");
  expect(octane.children.length).not.toBe(fennec.children.length);
});

test("rear and underbody thrust use local directions and freeze at a paused replay timestamp", () => {
  const car = buildCar("blue", "fennec");
  const boost = car.getObjectByName("boost-flame")!,
    jump = car.getObjectByName("jump-flame")!;
  animateThrusters(car, { boost: true, jump: 0.8 }, 4);
  expect(boost.visible).toBe(true);
  expect(jump.visible).toBe(true);
  const rearDirection = new Vector3(0, 1, 0).applyQuaternion(
    boost.children[0].quaternion,
  );
  const jumpDirection = new Vector3(0, 1, 0).applyQuaternion(
    jump.children[0].quaternion,
  );
  expect(rearDirection.x).toBeCloseTo(-1);
  expect(jumpDirection.y).toBeCloseTo(-1);
  const scale = boost.scale.clone();
  animateThrusters(car, { boost: true, jump: 0.8 }, 4);
  expect(boost.scale.equals(scale)).toBe(true);
  animateThrusters(car, { boost: false, jump: 0 }, 5);
  expect(boost.visible).toBe(false);
  expect(jump.visible).toBe(false);
});
