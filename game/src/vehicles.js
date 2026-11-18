// Cars: how one is built from boxes, how it drives, and the traffic that fills the city.
// A car is a THREE.Group with a body, cabin, four wheels, headlights and taillights; the
// physics is arcade — speed, steering and grip — so it feels good with a keyboard.
import { CAR, CITY } from './config.js';
import { clamp, createRandom, groundDistance, wrapAngle } from './random.js';

const THREE = window.THREE;

const CAR_COLOURS = [0xd94f4f, 0x4f7fd9, 0xf2e3c9, 0x2f2f38, 0xe8b04b, 0x7fb069, 0x9b59b6, 0x4fd9c9, 0xd9d9d9, 0x8a5a3b];
const TAXI_COLOUR = 0xf2c94c;

/** Build a low-poly car. `kind` is sedan | sports | taxi | truck | police. */
export function createCarMesh(kind, colour) {
  const group = new THREE.Group();
  group.name = `car-${kind}`;
  const bodyColour = kind === 'police' ? 0xf2f2f2 : kind === 'taxi' ? TAXI_COLOUR : (colour ?? 0xd94f4f);
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColour });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const isTruck = kind === 'truck';
  const length = kind === 'sports' ? 4.6 : isTruck ? 5.6 : 4.2;
  const width = isTruck ? 2.2 : 1.9;

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.75, length), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.3, 0.6, length * (isTruck ? 0.3 : 0.45)),
    darkMat,
  );
  cabin.position.set(0, 1.3, isTruck ? length * 0.28 : -length * 0.05);
  group.add(cabin);
  if (isTruck) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.5, length * 0.45), new THREE.MeshLambertMaterial({ color: 0x6b5a45 }));
    bed.position.set(0, 1.1, -length * 0.25);
    group.add(bed);
  }
  if (kind === 'police') {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.3, length), new THREE.MeshLambertMaterial({ color: 0x1c1f26 }));
    skirt.position.y = 0.35;
    group.add(skirt);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.72, -0.1);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.35), new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xaa0000 }));
    red.position.set(-0.32, 1.86, -0.1);
    red.name = 'light-red';
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.35), new THREE.MeshLambertMaterial({ color: 0x2a6bff, emissive: 0x0033aa }));
    blue.position.set(0.32, 1.86, -0.1);
    blue.name = 'light-blue';
    group.add(blue);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.4), new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x888844 }));
    sign.position.set(0, 1.72, 0);
    group.add(sign);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x999966 });
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0x770000 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.12), headMat);
    head.position.set(sx * (width / 2 - 0.3), 0.72, length / 2 + 0.02);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.12), tailMat);
    tail.position.set(sx * (width / 2 - 0.3), 0.72, -length / 2 - 0.02);
    group.add(tail);
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [wx, wz] of [[-width / 2, length / 2 - 0.8], [width / 2, length / 2 - 0.8], [-width / 2, -length / 2 + 0.8], [width / 2, -length / 2 + 0.8]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  group.userData = { kind, length, width, wheels, bodyMat, smoke: 0 };
  return group;
}

/** One traffic car: a lane on the grid, a speed, and a simple follow-the-road brain. */
export function createTrafficCar(scene, rng, colliders) {
  const kind = rng.pick(['sedan', 'sedan', 'sedan', 'taxi', 'truck', 'sports']);
  const mesh = createCarMesh(kind, CAR_COLOURS[rng.int(0, CAR_COLOURS.length - 1)]);
  scene.add(mesh);
  return spawnTrafficCar(mesh, rng);
}

function spawnTrafficCar(mesh, rng) {
  const alongAvenue = rng.chance(0.5);
  const line = CITY.avenues[rng.int(0, CITY.avenues.length - 1)];
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = (rng.chance(0.5) ? 3.5 : -3.5) * dir;
  const pos = alongAvenue
    ? { x: line + lane, z: rng.range(-280, 280) }
    : { x: rng.range(-280, 280), z: line + lane };
  const angle = alongAvenue ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  mesh.position.set(pos.x, 0, pos.z);
  mesh.rotation.y = angle;
  return {
    mesh,
    kind: mesh.userData.kind,
    alongAvenue,
    line,
    dir,
    speed: rng.range(8, 14),
    cruise: rng.range(8, 14),
    angle,
    driver: null,
    isPlayer: false,
    isPolice: false,
    stuck: 0,
  };
}

/**
 * Drive one car forward for `dt`: steering, acceleration, braking and building
 * collisions. `input` is {forward, back, left, right, brake}. Returns speed in m/s.
 */
export function driveCar(car, input, dt, colliders) {
  const tune = CAR[car.kind] || CAR.sedan;
  const forward = new THREE.Vector3(Math.sin(car.angle), 0, Math.cos(car.angle));
  if (input.forward) car.speed += tune.accel * dt;
  if (input.back) car.speed -= tune.accel * 0.7 * dt;
  if (input.brake) {
    car.speed -= Math.sign(car.speed) * tune.brake * dt;
    if (Math.abs(car.speed) < 0.5) car.speed = 0;
  }
  car.speed -= car.speed * 0.55 * dt;
  car.speed = clamp(car.speed, -10, tune.topSpeed);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const turnRate = steer * tune.turn * clamp(Math.abs(car.speed) / 10, 0, 1) * Math.sign(car.speed || 1);
  car.angle += turnRate * dt;
  car.mesh.position.x += Math.sin(car.angle) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.angle) * car.speed * dt;
  car.mesh.rotation.y = car.angle;
  // Wheels spin with speed.
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
  // Buildings push the car back out.
  const p = car.mesh.position;
  const r = 1.6;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(p.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - nx; const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      p.x += (dx / d) * (r - d);
      p.z += (dz / d) * (r - d);
      if (Math.abs(car.speed) > 6) car.speed *= 0.4;
      car.damage = (car.damage || 0) + Math.abs(car.speed);
    }
  }
  const clamped = { x: Math.max(-308, Math.min(308, p.x)), z: Math.max(-308, Math.min(308, p.z)) };
  p.x = clamped.x; p.z = clamped.z;
  return car.speed;
}

/** Traffic manager: keeps N cars on the roads, respawning the ones that leave town. */
export function createTraffic(scene, seed, colliders, count = 26) {
  const rng = createRandom(seed + 77);
  const cars = [];
  for (let i = 0; i < count; i += 1) cars.push(createTrafficCar(scene, rng, colliders));

  function step(dt, playerPos) {
    for (const car of cars) {
      if (car.isPlayer) continue;
      // Slow down for the car ahead on the same lane.
      let target = car.cruise;
      for (const other of cars) {
        if (other === car || other.alongAvenue !== car.alongAvenue || other.line !== car.line || other.dir !== car.dir) continue;
        const ahead = car.alongAvenue
          ? (other.mesh.position.z - car.mesh.position.z) * car.dir
          : (other.mesh.position.x - car.mesh.position.x) * car.dir;
        if (ahead > 0 && ahead < 13) { target = 0; break; }
      }
      // And for the player, so traffic does not pile into them.
      if (playerPos) {
        const d = groundDistance(car.mesh.position.x, car.mesh.position.z, playerPos.x, playerPos.z);
        if (d < 10) target = Math.min(target, 2);
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      const p = car.mesh.position;
      if (car.alongAvenue) p.z += car.dir * car.speed * dt;
      else p.x += car.dir * car.speed * dt;
      // At an intersection, sometimes turn onto a cross street.
      const nearCross = CITY.streets.some((s) => Math.abs((car.alongAvenue ? p.z : p.x) - s) < 1.2);
      if (nearCross && rng.chance(0.012)) {
        car.alongAvenue = !car.alongAvenue;
        car.line = car.alongAvenue ? p.x : p.z;
        // Snap the line to the nearest road.
        const lines = car.alongAvenue ? CITY.avenues : CITY.streets;
        car.line = lines.reduce((best, l) => (Math.abs(l - car.line) < Math.abs(best - car.line) ? l : best), lines[0]);
        car.dir = rng.chance(0.5) ? 1 : -1;
        car.angle = car.alongAvenue ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        car.mesh.rotation.y = car.angle;
      }
      // Off the edge of town: respawn on the far side.
      if (Math.abs(p.x) > 300 || Math.abs(p.z) > 300) {
        const fresh = spawnTrafficCar(car.mesh, rng);
        Object.assign(car, fresh);
      }
      for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
    }
  }

  return {
    cars,
    step,
    /** The nearest non-player car within `radius` of a point, if any. */
    nearest(x, z, radius) {
      let best = null; let bestD = radius;
      for (const car of cars) {
        if (car.isPlayer) continue;
        const d = groundDistance(car.mesh.position.x, car.mesh.position.z, x, z);
        if (d < bestD) { bestD = d; best = car; }
      }
      return best;
    },
    /** Park a few sports cars where mission 2 expects them, on Beach Boulevard. */
    parkSportsCars() {
      const parked = [];
      const spots = [{ x: 70, z: 266, angle: 0 }, { x: 140, z: 266, angle: 0 }, { x: -70, z: 266, angle: 0 }];
      for (const s of spots) {
        const mesh = createCarMesh('sports', 0xd94f4f);
        mesh.position.set(s.x, 0, s.z);
        mesh.rotation.y = s.angle;
        scene.add(mesh);
        parked.push({ mesh, kind: 'sports', alongAvenue: true, line: s.x, dir: 1, speed: 0, cruise: 0, angle: s.angle, isPlayer: false, isPolice: false, parked: true });
        cars.push(parked[parked.length - 1]);
      }
      return parked;
    },
  };
}
