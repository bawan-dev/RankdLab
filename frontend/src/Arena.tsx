import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  buildCar,
  dressStadium,
  contactShadow,
  animateThrusters,
} from "./replayVisuals";
import { carBody } from "./carBodies";
import type { Finding, ReplayData } from "./types";
import {
  frameIndex,
  interpolate,
  toWorld,
  recordedSegments,
  tacticalFraming,
  replayThrust,
} from "./playback";

export type CameraMode =
  | "director"
  | "overhead"
  | "perspective"
  | "ball"
  | "player"
  | "aerial"
  | "free";
type Props = {
  data: ReplayData;
  time: number;
  playerId: string;
  camera: CameraMode;
  finding: Finding | null;
  zoom?: number;
};

function dispose(root: THREE.Object3D) {
  root.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Sprite
    ) {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if ("map" in material) material.map?.dispose();
        material.dispose();
      });
    }
  });
}

export default function Arena(props: Props) {
  const mount = useRef<HTMLDivElement>(null),
    current = useRef(props);
  const [error, setError] = useState("");
  useEffect(() => {
    current.current = props;
  });
  const data = props.data;
  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError(
        "The 3D viewer needs WebGL. Enable hardware acceleration or use a supported browser.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#0c1420");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "3D reconstruction of recorded replay positions",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#0c1420", 180, 400);
    scene.add(new THREE.HemisphereLight("#c8ddff", "#162235", 2.8));
    const light = new THREE.DirectionalLight("#fff6e0", 2);
    light.position.set(-40, 80, 20);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
    camera.position.set(100, 110, 110);
    const look = new THREE.Vector3();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 10;
    controls.maxDistance = 240;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.enabled = false;
    renderer.domElement.tabIndex = 0;
    controls.listenToKeyEvents(renderer.domElement);

    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
      opacity = 1,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.85,
          transparent: opacity < 1,
          opacity,
        }),
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    };
    box(0, -0.6, 0, 88, 1, 109, "#182533");
    box(0, -0.04, -25.6, 81.92, 0.1, 51.2, "#18334d");
    box(0, -0.04, 25.6, 81.92, 0.1, 51.2, "#3d302b");
    dressStadium(scene);
    const lines = new THREE.Group();
    scene.add(lines);
    const line = (
      points: THREE.Vector3[],
      color: string,
      group: THREE.Group = lines,
    ) => {
      const object = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }),
      );
      group.add(object);
      return object;
    };
    line(
      [
        [-40.96, 0.12, -51.2],
        [40.96, 0.12, -51.2],
        [40.96, 0.12, 51.2],
        [-40.96, 0.12, 51.2],
        [-40.96, 0.12, -51.2],
      ].map((p) => new THREE.Vector3(...p)),
      "#7695b3",
    );
    line(
      [new THREE.Vector3(-40.96, 0.12, 0), new THREE.Vector3(40.96, 0.12, 0)],
      "#94b6d6",
    );
    line(
      Array.from(
        { length: 65 },
        (_, i) =>
          new THREE.Vector3(
            Math.cos((i / 64) * Math.PI * 2) * 9.2,
            0.12,
            Math.sin((i / 64) * Math.PI * 2) * 9.2,
          ),
      ),
      "#94b6d6",
    );
    for (const side of [-1, 1]) {
      const color = side < 0 ? "#479eff" : "#f69a50";
      box(side * 41.4, 2, 0, 0.5, 4, 102.4, "#718ba1", 0.12);
      box(0, 2, side * 51.7, 82, 4, 0.5, "#718ba1", 0.12);
      box(-8.93, 3.2, side * 51.2, 0.3, 6.4, 0.3, color);
      box(8.93, 3.2, side * 51.2, 0.3, 6.4, 0.3, color);
      box(0, 6.4, side * 51.2, 18.16, 0.3, 0.3, color);
      box(0, 3.2, side * 57, 18.16, 6.4, 0.2, color, 0.12);
      box(0, 0.1, side * 54.2, 18, 0.1, 6, color, 0.2);
      line(
        [
          [-18, 0.12, side * 51.2],
          [-18, 0.12, side * 34],
          [18, 0.12, side * 34],
          [18, 0.12, side * 51.2],
        ].map((p) => new THREE.Vector3(...p)),
        color,
      );
    }
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9275, 2),
      new THREE.MeshStandardMaterial({
        color: "#f4f4e9",
        roughness: 0.4,
        emissive: "#343a40",
      }),
    );
    scene.add(ball);
    const seams = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.935, 1)),
      new THREE.LineBasicMaterial({
        color: "#536978",
        transparent: true,
        opacity: 0.65,
      }),
    );
    ball.add(seams);
    const ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshBasicMaterial({
        color: "#04121a",
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    ballShadow.rotation.x = -Math.PI / 2;
    scene.add(ballShadow);

    const cars = new Map<string, THREE.Group>();
    const shadows = new Map<string, ReturnType<typeof contactShadow>>();
    for (const player of data.metadata.players) {
      const car = buildCar(
        player.team === 0 ? "#338eff" : "#ff953e",
        carBody(player).model,
      );
      scene.add(car);
      cars.set(player.id, car);
      const shadow = contactShadow(2);
      scene.add(shadow);
      shadows.set(player.id, shadow);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.font = "500 30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e9f1fc";
      ctx.fillText(player.name, 256, 42, 500);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
        }),
      );
      sprite.scale.set(12, 1.5, 1);
      sprite.name = `name-${player.id}`;
      scene.add(sprite);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.7, 40),
      new THREE.MeshBasicMaterial({ color: "#d4f9ab", side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const annotations = new THREE.Group();
    scene.add(annotations);
    let lastFinding: string | undefined;
    const updateAnnotations = (finding: Finding | null) => {
      dispose(annotations);
      annotations.clear();
      if (!finding) return;
      const paths = recordedSegments(
        data.frames,
        finding.time - 2,
        finding.time + 3,
        finding.player_id,
      ).map((segment) =>
        segment.map((p) => toWorld(p).add(new THREE.Vector3(0, 0.5, 0))),
      );
      for (const path of paths) line(path, "#ff6b7d", annotations);
      const path = paths.at(-1) ?? [];
      for (const segment of recordedSegments(
        data.frames,
        finding.time - 2,
        finding.time + 3,
      )) {
        line(segment.map(toWorld), "#ffd88c", annotations);
      }
      const sample = data.frames[frameIndex(data.frames, finding.time)];
      for (const id of finding.involved_player_ids ??
        Object.keys(sample.players)) {
        const actor = sample.players[id];
        if (!actor) continue;
        const marker = new THREE.Mesh(
          new THREE.RingGeometry(1.6, 2, 28),
          new THREE.MeshBasicMaterial({
            color: "#c1d9ed",
            side: THREE.DoubleSide,
          }),
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.copy(toWorld(actor.position));
        marker.position.y += 0.3;
        annotations.add(marker);
      }
      const at =
        data.frames[frameIndex(data.frames, finding.time)].players[
          finding.player_id
        ];
      if (at) {
        const start = toWorld(at.position).add(new THREE.Vector3(0, 0.5, 0));
        const destination = toWorld(finding.target ?? at.position).add(
          new THREE.Vector3(0, 0.5, 0),
        );
        const delta = destination.clone().sub(start);
        if (delta.length() > 0.1)
          annotations.add(
            new THREE.ArrowHelper(
              delta.clone().normalize(),
              start,
              delta.length(),
              "#8adea2",
              2,
              1,
            ),
          );
        const end = path.at(-1),
          tail = path.at(-5);
        if (end && tail && end.distanceTo(tail) > 0.1) {
          const delta = end.clone().sub(tail);
          annotations.add(
            new THREE.ArrowHelper(
              delta.clone().normalize(),
              tail,
              delta.length(),
              "#ff6b7d",
              1.5,
              0.8,
            ),
          );
        }
      }
      const player = data.metadata.players.find(
        (p) => p.id === finding.player_id,
      );
      const zone = new THREE.Mesh(
        new THREE.PlaneGeometry(32, 16),
        new THREE.MeshBasicMaterial({
          color: "#f66a7b",
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
        }),
      );
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(0, 0.2, player?.team === 0 ? -42 : 42);
      annotations.add(zone);
    };
    const resize = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });
    resize.observe(host);
    let raf = 0,
      last = performance.now(),
      lastReplayTime = current.current.time,
      lastPlayerId = current.current.playerId;
    const render = (now: number) => {
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;
      const {
        time,
        playerId,
        camera: mode,
        finding,
        zoom = 1,
      } = current.current;
      const seeked =
        Math.abs(time - lastReplayTime) > 0.25 || playerId !== lastPlayerId;
      lastReplayTime = time;
      lastPlayerId = playerId;
      const i = frameIndex(data.frames, time),
        a = data.frames[i],
        b = data.frames[Math.min(i + 1, data.frames.length - 1)];
      const span = b.time - a.time,
        alpha = span > 0 ? Math.max(0, Math.min(1, (time - a.time) / span)) : 0;
      const continuous = span < 0.25 && a.state === b.state;
      const ballSample = interpolate(a.ball, b.ball, alpha, continuous, span);
      ball.visible = !!ballSample;
      ballShadow.visible = !!ballSample;
      if (ballSample) {
        ball.position.copy(ballSample.position);
        ball.quaternion.copy(ballSample.rotation);
        ballShadow.position.set(ball.position.x, 0.2, ball.position.z);
        ballShadow.scale.setScalar(1 + Math.min(2, ball.position.y / 12));
        ballShadow.visible = true;
      }
      for (const [id, car] of cars) {
        const sample = interpolate(
          a.players[id],
          b.players[id],
          alpha,
          continuous,
          span,
        );
        car.visible = !!sample;
        const thrust = replayThrust(data.frames, i, id, time);
        animateThrusters(car, thrust, time);
        if (id === playerId) {
          renderer.domElement.dataset.carBody = car.userData.bodyModel;
          renderer.domElement.dataset.boostActive = String(
            car.visible && car.getObjectByName("boost-flame")!.visible,
          );
          renderer.domElement.dataset.jumpActive = String(
            car.visible && car.getObjectByName("jump-flame")!.visible,
          );
          renderer.domElement.dataset.jumpThrust = (
            car.visible ? thrust.jump : 0
          ).toFixed(3);
        }
        const shadow = shadows.get(id)!;
        shadow.visible = !!sample;
        if (sample) {
          shadow.position.set(sample.position.x, 0.15, sample.position.z);
          shadow.material.opacity = Math.max(
            0.06,
            0.75 - sample.position.y * 0.07,
          );
          shadow.scale.setScalar(1 + Math.min(1.5, sample.position.y * 0.06));
        }
        const label = scene.getObjectByName(`name-${id}`)!;
        label.visible = !!sample;
        if (sample) {
          car.position.copy(sample.position);
          car.quaternion.copy(sample.rotation);
          label.position
            .copy(sample.position)
            .add(new THREE.Vector3(0, 3.1, 0));
          const unitsPerPixel =
            (2 *
              camera.position.distanceTo(label.position) *
              Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
            Math.max(1, host.clientHeight);
          const width = id === playerId ? 115 : 95;
          label.scale.set(
            width * unitsPerPixel,
            (width / 8) * unitsPerPixel,
            1,
          );
        }
      }
      const selected = cars.get(playerId);
      ring.visible = !!selected?.visible;
      if (selected) {
        ring.position.copy(selected.position);
        ring.position.y = Math.max(0.3, selected.position.y - 0.1);
      }
      if (lastFinding !== finding?.id) {
        lastFinding = finding?.id;
        updateAnnotations(finding);
      }
      const target = new THREE.Vector3(),
        position = new THREE.Vector3(105, 112, 112);
      controls.enabled = mode === "free";
      const effective =
        mode === "director" ? (finding ? "challenge" : "play") : mode;
      if (effective === "play") {
        const positions = data.metadata.players.flatMap((p) =>
          a.players[p.id] ? [a.players[p.id]!.position] : [],
        );
        const anchor = a.ball?.position;
        const close = anchor
          ? positions.filter((p) => toWorld(p).distanceTo(ball.position) < 30)
          : positions;
        const focus = [...close];
        if (anchor) focus.push(anchor);
        if (a.players[playerId]) focus.push(a.players[playerId]!.position);
        const framing = tacticalFraming(focus, camera.aspect);
        target.copy(framing.target);
        position.copy(framing.position);
      }
      if (effective === "overhead")
        position.set(
          0,
          Math.max(145, 46 / (Math.tan((24 * Math.PI) / 180) * camera.aspect)),
          0.01,
        );
      if (effective === "ball") {
        target.copy(ball.position);
        position.copy(target).add(new THREE.Vector3(35, 40, 45));
      }
      if (effective === "player" && selected) {
        target.copy(selected.position);
        position.copy(target).add(new THREE.Vector3(14, 12, 18));
      }
      if (effective === "aerial") {
        target.copy(ball.position);
        target.y = Math.max(4, target.y);
        position.copy(target).add(new THREE.Vector3(55, 26, 50));
      }
      if (effective === "challenge" && finding) {
        const frame = data.frames[frameIndex(data.frames, time)];
        const ids =
          finding.involved_player_ids ?? data.metadata.players.map((p) => p.id);
        const points = ids.flatMap((id) =>
          frame.players[id] ? [frame.players[id]!.position] : [],
        );
        if (frame.ball) points.push(frame.ball.position);
        const framing = tacticalFraming(points, camera.aspect);
        target.copy(framing.target);
        position.copy(framing.position);
      }
      const easing =
        seeked || window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 1
          : 1 - Math.exp(-elapsed * 4);
      if (mode !== "free") {
        position.sub(target).divideScalar(zoom).add(target);
        camera.position.lerp(position, easing);
        look.lerp(target, easing);
        camera.lookAt(look);
        controls.target.copy(look);
      } else {
        controls.update();
        look.copy(controls.target);
      }
      renderer.domElement.dataset.cameraMode = effective;
      renderer.domElement.dataset.cameraDistance = camera.position
        .distanceTo(look)
        .toFixed(3);
      renderer.domElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((v) => v.toFixed(2))
        .join(",");
      renderer.domElement.dataset.annotationCount = String(
        annotations.children.length,
      );
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      dispose(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [data]);
  return (
    <div ref={mount} className="arena">
      {error && (
        <div className="arena-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
