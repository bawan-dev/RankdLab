import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function contactShadow(radius: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
  gradient.addColorStop(0, "#020a10b0");
  gradient.addColorStop(1, "#020a1000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

// Original stylised assets. These are presentation geometry, not recovered car cosmetics.
export function buildCar(color: string) {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.65,
    roughness: 0.27,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#111c29",
    metalness: 0.4,
    roughness: 0.45,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: "#719fb8",
    metalness: 0.75,
    roughness: 0.16,
  });
  function part(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    r = 0.08,
  ) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, r),
      material,
    );
    mesh.position.set(x, y, z);
    car.add(mesh);
    return mesh;
  }
  part(1.85, 0.3, 1.12, 0, 0.18, 0, trim);
  part(1.9, 0.42, 1.06, 0, 0.43, 0, paint);
  const hood = part(0.8, 0.17, 0.98, 0.55, 0.66, 0, paint);
  hood.rotation.z = -0.08;
  const cabin = part(0.9, 0.4, 0.86, -0.2, 0.83, 0, glass);
  cabin.rotation.z = 0.08;
  part(0.65, 0.08, 0.92, -0.27, 1.06, 0, paint, 0.03);
  part(0.06, 0.43, 0.91, -0.57, 0.82, 0, paint, 0.02);
  part(0.08, 0.37, 0.89, 0.18, 0.83, 0, paint, 0.02);
  for (const side of [-1, 1]) {
    part(0.8, 0.04, 0.03, -0.19, 0.79, side * 0.45, trim, 0.01);
    part(1.6, 0.08, 0.07, 0, 0.26, side * 0.57, paint, 0.02);
    part(
      0.08,
      0.12,
      0.27,
      0.98,
      0.48,
      side * 0.32,
      new THREE.MeshBasicMaterial({ color: "#e7f6ff" }),
      0.02,
    );
    part(
      0.06,
      0.1,
      0.3,
      -0.98,
      0.48,
      side * 0.3,
      new THREE.MeshBasicMaterial({ color: "#ff4b4b" }),
      0.02,
    );
    part(0.08, 0.22, 0.06, -0.73, 0.77, side * 0.36, trim, 0.01);
    for (const x of [-0.61, 0.61]) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31, 0.31, 0.21, 20),
        trim,
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, 0.14, side * 0.57);
      car.add(tire);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.225, 12),
        new THREE.MeshStandardMaterial({
          color: "#b6c7d5",
          metalness: 0.85,
          roughness: 0.25,
        }),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(tire.position);
      car.add(rim);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8),
        paint,
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(tire.position);
      car.add(hub);
    }
  }
  part(0.28, 0.06, 1.16, -0.77, 0.91, 0, paint, 0.02);
  part(0.03, 0.025, 0.68, 0.55, 0.76, 0, trim, 0.01);
  // Modest visual emphasis keeps silhouettes readable at tactical distances.
  car.scale.setScalar(1.35);
  return car;
}

export function dressStadium(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  let seed = 19;
  for (let y = 0; y < 1024; y++) {
    const stripe = Math.floor(y / 85) % 2;
    ctx.fillStyle = stripe ? "#284e43" : "#315b4d";
    ctx.fillRect(0, y, 1024, 1);
  }
  for (let i = 0; i < 20000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = (seed >>> 16) % 1024;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = (seed >>> 16) % 1024;
    ctx.fillStyle = i % 2 ? "#98bda611" : "#081e161a";
    ctx.fillRect(x, y, 1, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const turf = new THREE.Mesh(
    new THREE.PlaneGeometry(81.92, 102.4),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
  );
  turf.rotation.x = -Math.PI / 2;
  turf.position.y = 0.08;
  scene.add(turf);
  function beam(
    a: THREE.Vector3,
    b: THREE.Vector3,
    color: string,
    radius = 0.065,
  ) {
    const delta = b.clone().sub(a);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    scene.add(mesh);
  }
  // Open-sided seating and floodlights maintain sight lines from analysis cameras.
  for (const side of [-1, 1]) {
    const color = side < 0 ? "#499bff" : "#ffae62";
    for (let row = 0; row < 5; row++) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.5, 122),
        new THREE.MeshStandardMaterial({
          color: row % 2 ? "#26384b" : "#1c2c3c",
          roughness: 0.9,
        }),
      );
      stand.position.set(side * (48 + row * 2), row * 1.6 - 1, 0);
      scene.add(stand);
    }
    for (const z of [-51.2, 51.2]) {
      beam(
        new THREE.Vector3(side * 40.96, 0.18, z),
        new THREE.Vector3(side * 40.96, 0.18, -z),
        "#aac4c5",
        0.055,
      );
    }
    // Recessed goals, with a deliberately sparse net that stays legible at distance.
    for (let x = -8.8; x <= 8.8; x += 1.1)
      beam(
        new THREE.Vector3(x, 0.2, side * 57),
        new THREE.Vector3(x, 6.4, side * 57),
        color,
        0.025,
      );
    for (let y = 0.6; y <= 6.4; y += 0.8)
      beam(
        new THREE.Vector3(-8.9, y, side * 57),
        new THREE.Vector3(8.9, y, side * 57),
        color,
        0.025,
      );
    for (const x of [-8.93, 8.93]) {
      beam(
        new THREE.Vector3(x, 6.4, side * 51.2),
        new THREE.Vector3(x, 6.4, side * 57),
        color,
        0.08,
      );
      beam(
        new THREE.Vector3(x, 0.2, side * 51.2),
        new THREE.Vector3(x, 0.2, side * 57),
        color,
        0.06,
      );
    }
    for (const x of [-46, 46]) {
      beam(
        new THREE.Vector3(x, 0, side * 47),
        new THREE.Vector3(x, 22, side * 47),
        "#526b80",
        0.12,
      );
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.5, 1.2),
        new THREE.MeshBasicMaterial({ color: "#d9efff" }),
      );
      panel.position.set(x, 22, side * 47);
      scene.add(panel);
    }
    const endTrim = new THREE.Mesh(
      new THREE.BoxGeometry(82, 0.12, 0.2),
      new THREE.MeshBasicMaterial({ color }),
    );
    endTrim.position.set(0, 0.17, side * 51.2);
    scene.add(endTrim);
  }
}
