// Mara Voss, on foot and behind the wheel: walking, sprinting, punching, shooting,
// entering and stealing cars, and taking damage. The camera follows from behind.
import { PALETTE, PLAYER } from './config.js';
import { clamp, wrapAngle } from './random.js';
import { createPedMesh } from './pedestrians.js';
import { resolveBuildingCollisions } from './city.js';

const THREE = window.THREE;

/** Build Mara: green jacket, dark jeans, ready to run. */
export function createPlayerMesh() {
  const mesh = createPedMesh(PALETTE.playerJacket);
  mesh.name = 'mara-voss';
  // A cap, so she reads as the driver from a distance.
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 0.12, 10),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cap.position.y = 1.86;
  mesh.add(cap);
  return mesh;
}

export function createPlayer(scene, spawn) {
  const mesh = createPlayerMesh();
  mesh.position.set(spawn.x, 0, spawn.z);
  scene.add(mesh);
  return {
    mesh,
    x: spawn.x,
    z: spawn.z,
    angle: Math.PI,
    health: PLAYER.health,
    armour: 0,
    cash: 150,
    ammo: PLAYER.pistolAmmo,
    armed: false,
    inCar: null,
    speed: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    invulnerable: 0,
    walkPhase: 0,
  };
}

/**
 * Step the player on foot: WASD moves relative to the camera, Shift sprints, F punches
 * the nearest person in front, mouse click shoots when armed. Returns events for the
 * main loop: { punched, shot, hitPed }.
 */
export function stepPlayerOnFoot(player, input, cameraAngle, dt, colliders, peds, onCrime) {
  const events = { punched: null, shot: false, hitPed: null };
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  const fwd = (input.held('forward') ? 1 : 0) - (input.held('back') ? 1 : 0);
  const strafe = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
  const sprint = input.held('sprint');
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const mx = Math.sin(cameraAngle) * fwd + Math.cos(cameraAngle) * strafe;
  const mz = Math.cos(cameraAngle) * fwd - Math.sin(cameraAngle) * strafe;
  const len = Math.hypot(mx, mz) || 1;
  if (fwd !== 0 || strafe !== 0) {
    player.x += (mx / len) * speed * dt;
    player.z += (mz / len) * speed * dt;
    player.angle = Math.atan2(mx / len, mz / len);
    player.walkPhase += dt * speed * 1.6;
    const swing = Math.sin(player.walkPhase) * 0.45;
    const legL = player.mesh.getObjectByName('legL');
    const legR = player.mesh.getObjectByName('legR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
  }
  const resolved = resolveBuildingCollisions(player.x, player.z, PLAYER.radius, colliders);
  player.x = clamp(resolved.x, -308, 308);
  player.z = clamp(resolved.z, -308, 308);
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.angle;

  // Punch: the nearest living ped in front, inside range.
  if (input.wasPressed('punch') && player.punchCooldown <= 0) {
    player.punchCooldown = 0.45;
    const target = peds.nearest(player.x, player.z, PLAYER.punchRange + 0.6);
    if (target) {
      target.health -= PLAYER.punchDamage;
      events.punched = target;
      if (target.health <= 0) {
        events.hitPed = target;
        peds.remove(target);
        onCrime('assault');
      }
    }
  }
  // Shoot: click fires the pistol at the nearest ped in the aim cone (or straight ahead).
  if (input.mouseClicked() && player.armed && player.ammo > 0 && player.shootCooldown <= 0) {
    player.shootCooldown = 0.3;
    player.ammo -= 1;
    events.shot = true;
    const target = peds.nearest(player.x, player.z, PLAYER.pistolRange, false);
    if (target) {
      target.health -= PLAYER.pistolDamage;
      if (target.health <= 0) {
        events.hitPed = target;
        peds.remove(target);
        onCrime('shooting');
      }
    } else {
      onCrime('shooting');
    }
  }
  return events;
}

/** Damage the player, armour absorbing first. Returns true when they go down. */
export function damagePlayer(player, amount) {
  if (player.invulnerable > 0) return false;
  let rest = amount;
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, rest);
    player.armour -= absorbed;
    rest -= absorbed;
  }
  player.health -= rest;
  player.invulnerable = 0.4;
  return player.health <= 0;
}

/** Heal the player, up to full health. */
export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.health, player.health + amount);
}
