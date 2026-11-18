// PORTO LUZ v2.1 — the screenshot scenes: real play, steered by an autopilot.
// The screenshot scenes behind ?shot=cover|drive|mission|start. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what real play looks like and the same seed
// always gives the same frame. The cover shows a police chase with the wanted level,
// the minimap and a mission objective on the HUD all at once.
import { STEP } from './config.js';
import { wrapAngle } from './random.js';
import { createCarMesh } from './vehicles.js';

const THREE = window.THREE;

/** A fake input object that answers like the real one, steered by an autopilot. */
function autopilotInput(drive) {
  return {
    held(action) { return !!drive[action]; },
    wasPressed() { return false; },
    mouseClicked() { return false; },
    takeOrbit() { return { dx: 0, dy: 0 }; },
    takeWheel() { return 0; },
    endFrame() {},
  };
}

/** Put Mara in a sports car at (x, z), facing `angle`, and mark it as hers. */
function placeInSportsCar(G, x, z, angle) {
  const mesh = createCarMesh('sports', 0xd94f4f);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  G.scene.add(mesh);
  const car = {
    mesh, kind: 'sports', angle, speed: 0, isPlayer: true, isPolice: false,
    cruise: 0, alongAvenue: true, line: x, dir: 1,
  };
  G.traffic.cars.push(car);
  G.player.inCar = car;
  G.player.mesh.visible = false;
  G.player.x = x;
  G.player.z = z;
  G.player.angle = angle;
  return car;
}

/** Drive toward (tx, tz) for `seconds`, steering at the road ahead. */
function driveToward(G, car, tx, tz, seconds) {
  const steps = Math.round(seconds / STEP);
  let slowSteps = 0;
  for (let i = 0; i < steps; i += 1) {
    const desired = Math.atan2(tx - car.mesh.position.x, tz - car.mesh.position.z);
    const diff = wrapAngle(desired - car.angle);
    const drive = {
      forward: true,
      left: diff > 0.08,
      right: diff < -0.08,
      brake: false,
    };
    G.stepWorld(STEP, autopilotInput(drive));
    if (G.screen !== 'play') break;
    // Stuck against something: put the car back on the road, facing the target.
    if (Math.abs(car.speed) < 2) slowSteps += 1; else slowSteps = 0;
    if (slowSteps > 60) {
      car.mesh.position.x = Math.round(car.mesh.position.x / 70) * 70;
      car.mesh.position.z = Math.round(car.mesh.position.z / 70) * 70;
      car.angle = Math.atan2(tx - car.mesh.position.x, tz - car.mesh.position.z);
      car.mesh.rotation.y = car.angle;
      car.speed = 8;
      slowSteps = 0;
    }
  }
}

/** After the chase, pull two police cars and the helicopter into the frame. */
function frameTheChase(G, car) {
  const forward = { x: Math.sin(car.angle), z: Math.cos(car.angle) };
  const right = { x: Math.cos(car.angle), z: -Math.sin(car.angle) };
  const cops = G.police.cars.slice(0, 2);
  // One cutting across ahead, one pulling alongside — both inside the camera's view.
  const offsets = [
    { f: 20, r: -5 }, { f: -1, r: 9 },
  ];
  cops.forEach((cop, i) => {
    const o = offsets[i];
    cop.mesh.position.set(
      car.mesh.position.x + forward.x * o.f + right.x * o.r,
      0,
      car.mesh.position.z + forward.z * o.f + right.z * o.r,
    );
    cop.angle = car.angle;
    cop.mesh.rotation.y = car.angle;
    cop.speed = car.speed;
  });
  if (G.police.heli) {
    G.police.heli.mesh.position.set(
      car.mesh.position.x + forward.x * 58,
      30,
      car.mesh.position.z + forward.z * 58,
    );
  }
}

/** The mission-start banner has done its job by capture time: hide it. */
function hideBanner() {
  const el = document.getElementById('banner');
  if (el) el.style.display = 'none';
}

/** Chase camera behind the player's car. */
function chaseCamera(G, car) {
  const forward = { x: Math.sin(car.angle), z: Math.cos(car.angle) };
  G.camera.position.set(
    car.mesh.position.x - forward.x * 13,
    5.5,
    car.mesh.position.z - forward.z * 13,
  );
  G.camera.lookAt(car.mesh.position.x + forward.x * 12, 1.5, car.mesh.position.z + forward.z * 12);
}

/**
 * Stage the named scene in the live game object G (from main.js) and leave the
 * camera where the screenshot wants it. Called once per page load in shot mode.
 */
export function stageShot(name, G) {
  G.hud.setScreen('play');
  G.cameraYaw = Math.PI;
  if (name === 'start') {
    G.hud.setScreen('title');
    for (let i = 0; i < 240; i += 1) G.traffic.step(STEP, null);
    G.camera.position.set(210, 110, 300);
    G.camera.lookAt(0, 10, -40);
    return;
  }
  if (name === 'drive') {
    const car = placeInSportsCar(G, 70, -40, Math.PI);
    G.missions.startMission(0);
    driveToward(G, car, 70, -260, 5);
    chaseCamera(G, car);
    hideBanner();
    return;
  }
  if (name === 'mission') {
    // On the avenue facing the rivals at the Downtown intersection.
    G.player.x = 70;
    G.player.z = -185;
    G.player.angle = Math.PI;
    G.player.mesh.position.set(70, 0, -185);
    G.player.mesh.rotation.y = Math.PI;
    G.missions.startMission(4);
    for (let i = 0; i < 90; i += 1) G.stepWorld(STEP, autopilotInput({}));
    G.camera.position.set(70, 4.5, -166);
    G.camera.lookAt(70, 1.5, -210);
    hideBanner();
    return;
  }
  // cover: a three-star police chase on Beach Boulevard with a mission running.
  const car = placeInSportsCar(G, 0, 260, Math.PI);
  G.police.addCrime('shooting');
  G.police.addCrime('steal');
  G.missions.startMission(5);
  driveToward(G, car, 0, -260, 6);
  frameTheChase(G, car);
  chaseCamera(G, car);
  hideBanner();
}
