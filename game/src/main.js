// PORTO LUZ v2.1 — boot and the one loop; Mara drives and walks Porto Luz.
// Porto Luz — boot and the one loop. The world advances in fixed 1/60 s steps, the
// camera chases Mara from behind, and the game moves between title, play, paused,
// shop and game-over screens.
//
// ?seed=N fixes the city. ?shot=cover|drive|mission|start (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP, CITY, MISSIONS, SHOPS, SAFEHOUSES, SAVE_KEY, PLAYER } from './config.js';
import { createRandom, clamp, wrapAngle, groundDistance } from './random.js';
import { createCity, districtAt, resolveBuildingCollisions } from './city.js';
import { createCarMesh, createTraffic, driveCar } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPlayer, stepPlayerOnFoot, damagePlayer, healPlayer } from './player.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
function announce(message) { statusEl.textContent = message; }

/** Build the whole game object. `G` is the one thing every module shares. */
function createGame() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

  const city = createCity(scene, seed);
  const traffic = createTraffic(scene, seed, city.colliders, 26);
  traffic.parkSportsCars();
  const peds = createPedestrians(scene, seed, 42);
  const player = createPlayer(scene, city.places.spawn);
  player.armed = true; // Mara carries her pistol from the first job.
  const police = createPolice(scene, seed);
  const audio = createAudio();
  const hud = createHud();
  const input = createInput(canvas);

  const G = {
    scene, camera, renderer, city, traffic, peds, player, police, audio, hud, input,
    seed,
    screen: 'title',
    clockMinutes: 540,
    district: 'Beach',
    save: { cash: 150, missionsDone: 0, x: city.places.spawn.x, z: city.places.spawn.z },
    cameraYaw: Math.PI,
    cameraPitch: 0.32,
    cameraDist: 9,
    crimePos: null,
    crimeTimer: 0,
    sirenTimer: 0,
    particles: [],
    missions: null,
    beacon: null,
  };
  G.missions = createMissions(G);

  // The objective beacon: a glowing pillar the player can see across the city.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true), beaconMat);
  beacon.position.y = 30;
  scene.add(beacon);
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(3, 4.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.15;
  scene.add(beaconRing);
  G.beacon = beacon;
  G.beaconRing = beaconRing;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return G;
}

const G = createGame();
// The screenshot scenes drive the world through the same stepper the loop uses.
G.stepWorld = stepWorld;

/** Write the save game to this browser's storage. */
function saveGame() {
  const data = {
    cash: G.player.cash,
    health: G.player.health,
    armour: G.player.armour,
    missionsDone: G.save.missionsDone,
    x: G.player.x,
    z: G.player.z,
    ammo: G.player.ammo,
  };
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage off */ }
  G.save = { ...G.save, ...data };
}

/** Read the save game, if one exists. */
function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function applySave(data) {
  G.player.cash = data.cash ?? 150;
  G.player.health = data.health ?? PLAYER.health;
  G.player.armour = data.armour ?? 0;
  G.player.ammo = data.ammo ?? PLAYER.pistolAmmo;
  G.save.missionsDone = data.missionsDone ?? 0;
  G.save.cash = G.player.cash;
  G.player.x = data.x ?? G.city.places.spawn.x;
  G.player.z = data.z ?? G.city.places.spawn.z;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
}

function onCrime(kind) {
  const stars = G.police.addCrime(kind);
  G.crimePos = { x: G.player.x, z: G.player.z };
  G.crimeTimer = 4;
  if (stars > 0) G.hud.toast(`Wanted level ${stars} — the Porto Luz police are coming.`);
}

function onDamage(amount) {
  if (damagePlayer(G.player, amount)) wasted('WASTED');
}

function wasted(title) {
  if (G.screen !== 'play') return;
  G.screen = 'over';
  G.audio.busted();
  G.audio.setEngine(0, false);
  G.hud.setOver(title, title === 'BUSTED'
    ? 'The police took Mara in. Dario bails her out — minus a little cash.'
    : 'Mara is down. The crew picks her up at the hospital.');
  G.hud.setScreen('over');
  announce(`${title}. Game over.`);
}

function busted() {
  G.player.cash = Math.floor(G.player.cash * 0.9);
  wasted('BUSTED');
}

function respawn() {
  const hospital = G.city.places.hospital;
  G.player.health = PLAYER.health;
  G.player.armour = 0;
  G.player.ammo = PLAYER.pistolAmmo;
  G.player.x = hospital.x;
  G.player.z = hospital.z;
  G.player.mesh.position.set(hospital.x, 0, hospital.z);
  G.player.mesh.visible = true;
  if (G.player.inCar) { G.player.inCar.isPlayer = false; G.player.inCar = null; }
  G.police.clear();
  G.screen = 'play';
  G.hud.setScreen('play');
  saveGame();
  announce('Back on the streets.');
}

/** Enter the nearest car (stealing it if it has a driver), or exit the current one. */
function tryEnterCar() {
  if (G.player.inCar) {
    const car = G.player.inCar;
    car.isPlayer = false;
    car.speed = 0;
    G.player.inCar = null;
    G.player.x = car.mesh.position.x + Math.sin(car.angle + Math.PI / 2) * 3;
    G.player.z = car.mesh.position.z + Math.cos(car.angle + Math.PI / 2) * 3;
    G.player.mesh.visible = true;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    return;
  }
  const car = G.traffic.nearest(G.player.x, G.player.z, 4.5);
  if (!car) return;
  if (!car.parked) {
    onCrime('steal');
    G.hud.toast('You stole the car! The owner ran off shouting.');
  }
  car.isPlayer = true;
  car.parked = false;
  G.player.inCar = car;
  G.player.mesh.visible = false;
  G.audio.horn();
}

/** The E key: car, shop or safehouse, whichever is nearest. */
function interact() {
  if (G.player.inCar) { tryEnterCar(); return; }
  const car = G.traffic.nearest(G.player.x, G.player.z, 4.5);
  if (car) { tryEnterCar(); return; }
  for (const shop of SHOPS) {
    if (groundDistance(G.player.x, G.player.z, shop.x, shop.z) < 9) {
      openShop(shop);
      return;
    }
  }
  for (const house of SAFEHOUSES) {
    if (groundDistance(G.player.x, G.player.z, house.x, house.z) < 9) {
      healPlayer(G.player, 100);
      G.player.ammo = PLAYER.pistolAmmo;
      saveGame();
      G.hud.toast(`${house.name}: saved, healed and re-armed.`);
      G.audio.pickup();
      return;
    }
  }
}

function openShop(shop) {
  G.screen = 'shop';
  G.hud.openShop(shop, G.player.cash, (item) => {
    if (G.player.cash < item.price) return;
    G.player.cash -= item.price;
    if (item.health) healPlayer(G.player, item.health);
    if (item.armour) G.player.armour = Math.min(100, G.player.armour + item.armour);
    if (item.paint && G.player.inCar) G.player.inCar.mesh.userData.bodyMat.color.setHex(item.paint);
    G.audio.pickup();
    G.hud.toast(`Bought ${item.name}.`);
    G.screen = 'play';
    G.hud.setScreen('play');
  });
  document.getElementById('btn-closeshop').onclick = () => {
    G.screen = 'play';
    G.hud.setScreen('play');
  };
}

/** One fixed simulation step. `auto` is an autopilot input for screenshot scenes. */
function stepWorld(dt, auto) {
  const input = auto || G.input;
  G.clockMinutes += dt;
  G.district = districtAt(G.player.x, G.player.z);
  if (G.crimeTimer > 0) { G.crimeTimer -= dt; if (G.crimeTimer <= 0) G.crimePos = null; }

  // Attackers shoot at Mara.
  for (const ped of G.peds.peds) {
    if (!ped.alive || !ped.attacker) continue;
    const d = groundDistance(ped.mesh.position.x, ped.mesh.position.z, G.player.x, G.player.z);
    if (d < 42 && ped.shootCooldown <= 0) {
      ped.shootCooldown = 1.5;
      G.audio.gunshot();
      if (damagePlayer(G.player, 7)) { wasted('WASTED'); return; }
    }
  }

  if (G.player.inCar) {
    const car = G.player.inCar;
    const driveInput = {
      forward: input.held('forward'), back: input.held('back'),
      left: input.held('left'), right: input.held('right'), brake: input.held('brake'),
    };
    driveCar(car, driveInput, dt, G.city.colliders);
    G.player.x = car.mesh.position.x;
    G.player.z = car.mesh.position.z;
    G.player.angle = car.angle;
    G.audio.setEngine(Math.abs(car.speed) / 42, true);
    if (input.wasPressed('horn')) G.audio.horn();
    // Running over pedestrians is a crime.
    const victim = G.peds.nearest(G.player.x, G.player.z, 2.2);
    if (victim && Math.abs(car.speed) > 8) {
      G.peds.remove(victim);
      onCrime('hitPed');
      G.hud.toast('You hit a pedestrian! The city saw it.');
    }
    // Bumping traffic cars.
    for (const other of G.traffic.cars) {
      if (other === car || other.isPlayer) continue;
      const d = groundDistance(car.mesh.position.x, car.mesh.position.z, other.mesh.position.x, other.mesh.position.z);
      if (d < 3.6) {
        car.speed *= 0.55;
        other.speed = 0;
        car.damage = (car.damage || 0) + 4;
        if (car.damage > 60 && !car.smoking) { car.smoking = true; }
      }
    }
    // Smoke when the car is badly damaged.
    if (car.smoking && Math.random() < 0.12) spawnSmoke(car.mesh.position);
  } else {
    const events = stepPlayerOnFoot(G.player, input, G.cameraYaw, dt, G.city.colliders, G.peds, onCrime);
    if (events.shot) G.audio.gunshot();
    if (events.punched) G.audio.punch();
    G.audio.setEngine(0, false);
  }

  G.traffic.step(dt, { x: G.player.x, z: G.player.z });
  G.peds.step(dt, { x: G.player.x, z: G.player.z }, G.crimePos);
  const nearestPolice = G.police.step(dt, { x: G.player.x, z: G.player.z }, G.player.inCar, G.city.colliders, busted, onDamage);
  if (nearestPolice < 60) {
    G.sirenTimer -= dt;
    if (G.sirenTimer <= 0) { G.sirenTimer = 0.55; G.audio.sirenTick(Math.random() < 0.5); }
  }
  G.missions.update(dt);

  // Objective beacon follows the current marker.
  const marker = G.missions.markerPos();
  if (marker) {
    G.beacon.visible = true;
    G.beaconRing.visible = true;
    G.beacon.position.x = marker.x;
    G.beacon.position.z = marker.z;
    G.beaconRing.position.x = marker.x;
    G.beaconRing.position.z = marker.z;
    const pulse = 1 + Math.sin(performance.now() / 300) * 0.08;
    G.beacon.scale.set(pulse, 1, pulse);
  } else {
    G.beacon.visible = false;
    G.beaconRing.visible = false;
  }

  // Drifting clouds and smoke particles.
  for (const cloud of G.city.clouds) {
    cloud.position.x += dt * 1.5;
    if (cloud.position.x > 360) cloud.position.x = -360;
  }
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const p = G.particles[i];
    p.life -= dt;
    p.mesh.position.y += dt * 3;
    p.mesh.material.opacity = Math.max(0, p.life / 2);
    if (p.life <= 0) { G.scene.remove(p.mesh); G.particles.splice(i, 1); }
  }

  updateCamera(dt);
  G.hud.update(G, dt);
  if (G.player.health <= 0 && G.screen === 'play') wasted('WASTED');
}

function spawnSmoke(pos) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x444444, transparent: true, opacity: 0.45 }),
  );
  mesh.position.set(pos.x, 2.2, pos.z);
  G.scene.add(mesh);
  G.particles.push({ mesh, life: 1.2 });
  if (G.particles.length > 14) {
    const old = G.particles.shift();
    G.scene.remove(old.mesh);
  }
}

/** Chase camera: behind Mara, mouse drag orbits, wheel zooms. */
function updateCamera(dt) {
  const orbit = G.input.takeOrbit();
  G.cameraYaw -= orbit.dx * 0.005;
  G.cameraPitch = clamp(G.cameraPitch + orbit.dy * 0.003, 0.12, 0.9);
  G.cameraDist = clamp(G.cameraDist + G.input.takeWheel() * 0.01, 7, 22);
  const target = new THREE.Vector3(G.player.x, G.player.inCar ? 1.6 : 1.4, G.player.z);
  const dist = G.player.inCar ? G.cameraDist + 3 : G.cameraDist;
  const height = dist * Math.tan(G.cameraPitch) + 1.2;
  const desired = new THREE.Vector3(
    target.x - Math.sin(G.cameraYaw) * dist,
    target.y + height,
    target.z - Math.cos(G.cameraYaw) * dist,
  );
  const k = 1 - Math.exp(-dt * 5);
  G.camera.position.lerp(desired, k);
  G.camera.lookAt(target);
}

/** Prompt text for the nearest thing Mara can use. */
function updatePrompt() {
  if (G.screen !== 'play') { G.hud.setPrompt(''); return; }
  if (G.player.inCar) { G.hud.setPrompt('E — Exit car'); return; }
  if (G.traffic.nearest(G.player.x, G.player.z, 4.5)) { G.hud.setPrompt('E — Enter car (steal it)'); return; }
  for (const shop of SHOPS) {
    if (groundDistance(G.player.x, G.player.z, shop.x, shop.z) < 9) { G.hud.setPrompt(`E — ${shop.name}`); return; }
  }
  for (const house of SAFEHOUSES) {
    if (groundDistance(G.player.x, G.player.z, house.x, house.z) < 9) { G.hud.setPrompt(`E — ${house.name} (save & heal)`); return; }
  }
  G.hud.setPrompt('');
}

function startGame(fresh) {
  if (fresh) {
    try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    G.player.cash = 150;
    G.player.health = PLAYER.health;
    G.player.armour = 0;
    G.player.ammo = PLAYER.pistolAmmo;
    G.save.missionsDone = 0;
    G.player.x = G.city.places.spawn.x;
    G.player.z = G.city.places.spawn.z;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    G.police.clear();
  } else {
    const data = loadSave();
    if (data) applySave(data);
  }
  G.screen = 'play';
  G.hud.setScreen('play');
  G.audio.unlock();
  announce('Playing Porto Luz. Press M to start a mission.');
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
  document.getElementById('btn-new').addEventListener('click', () => startGame(true));
  document.getElementById('btn-how').addEventListener('click', () => {
    const el = document.getElementById('howto');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    G.screen = 'play';
    G.hud.setScreen('play');
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    saveGame();
    G.hud.toast('Game saved.');
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    saveGame();
    G.screen = 'title';
    G.hud.setScreen('title');
  });
  document.getElementById('btn-retry').addEventListener('click', respawn);

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot keys.
    if (G.screen === 'play') {
      if (G.input.wasPressed('pause')) {
        G.screen = 'paused';
        G.hud.setScreen('paused');
        announce('Paused.');
      }
      if (G.input.wasPressed('interact')) interact();
      if (G.input.wasPressed('mission')) G.missions.startNextMission();
      if (G.input.wasPressed('radio')) G.hud.toast(G.audio.nextStation());
      if (G.input.wasPressed('mute')) G.hud.toast(G.audio.toggleMute() ? 'Sound muted.' : 'Sound on.');
    } else if (G.screen === 'paused') {
      if (G.input.wasPressed('pause')) {
        G.screen = 'play';
        G.hud.setScreen('play');
      }
    } else if (G.screen === 'title') {
      if (G.input.wasPressed('confirm')) startGame(false);
    } else if (G.screen === 'over') {
      if (G.input.wasPressed('confirm')) respawn();
    }
    if (G.screen === 'play') {
      while (accumulator >= STEP) {
        stepWorld(STEP);
        accumulator -= STEP;
      }
      updatePrompt();
    } else {
      accumulator = 0;
      // The title screen still shows the living city behind it.
      if (G.screen === 'title') {
        G.cameraYaw += 0.0004;
        const t = new THREE.Vector3(0, 20, 0);
        G.camera.position.set(Math.sin(G.cameraYaw) * 260, 90, Math.cos(G.cameraYaw) * 260);
        G.camera.lookAt(t);
        G.traffic.step(STEP, null);
      }
    }
    G.renderer.render(G.scene, G.camera);
    G.input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') {
      G.screen = 'paused';
      G.hud.setScreen('paused');
    }
  });

  G.hud.setScreen('title');
  announce('Porto Luz. Press Enter or click Continue to play.');
  requestAnimationFrame(frame);
}

function runShot(name) {
  G.screen = 'play';
  stageShot(name, G);
  let painted = 0;
  function paint() {
    G.renderer.render(G.scene, G.camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else runGame();

// Exposed for the screenshot scenes: the world stepper and the helpers they drive.
export { G, stepWorld, saveGame, startGame };
