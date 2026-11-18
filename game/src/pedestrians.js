// Pedestrians: the people of Porto Luz. They stroll the sidewalks, cross at
// corners, and run when a crime happens near them. A few are attackers during
// defend missions.
import { CITY } from './config.js';
import { createRandom, groundDistance } from './random.js';

const THREE = window.THREE;

const SHIRT_COLOURS = [0xe8b04b, 0x4f8fd9, 0xd96a4f, 0x7fb069, 0xc96a9b, 0xf2e3c9, 0x8a7fbf, 0x3f7f6a];

/** A simple low-poly person: legs, torso, head, arms that swing as they walk. */
export function createPedMesh(shirtColour) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColour });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3550 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.08;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.66;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshLambertMaterial({ color: 0x2a2018 }));
  hair.position.y = 1.72;
  hair.scale.set(1, 0.7, 1);
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), pants);
  legL.position.set(-0.16, 0.36, 0);
  legL.name = 'legL';
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  legR.name = 'legR';
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirt);
  armL.position.set(-0.4, 1.1, 0);
  armL.name = 'armL';
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.4;
  armR.name = 'armR';
  group.add(armR);
  return group;
}

export function createPedestrians(scene, seed, count = 42) {
  const rng = createRandom(seed + 131);
  const peds = [];

  function randomSidewalkSpot() {
    // On a sidewalk: just off a road line, inside the city.
    const alongAvenue = rng.chance(0.5);
    const line = CITY.avenues[rng.int(0, CITY.avenues.length - 1)];
    const off = (rng.chance(0.5) ? 10.5 : -10.5);
    return alongAvenue
      ? { x: line + off, z: rng.range(-280, 280), alongAvenue: true }
      : { x: rng.range(-280, 280), z: line + off, alongAvenue: false };
  }

  function spawnPed(attacker = false) {
    const spot = randomSidewalkSpot();
    const mesh = createPedMesh(SHIRT_COLOURS[rng.int(0, SHIRT_COLOURS.length - 1)]);
    mesh.position.set(spot.x, 0, spot.z);
    scene.add(mesh);
    const ped = {
      mesh,
      alongAvenue: spot.alongAvenue,
      dir: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(1.2, 2.2),
      walkPhase: rng.range(0, Math.PI * 2),
      fleeing: false,
      fleeTime: 0,
      attacker,
      health: attacker ? 60 : 100,
      shootCooldown: rng.range(0.5, 1.5),
      alive: true,
      isTaxiFare: false,
    };
    peds.push(ped);
    return ped;
  }

  for (let i = 0; i < count; i += 1) spawnPed(false);

  function step(dt, playerPos, crimePos) {
    for (const ped of peds) {
      if (!ped.alive) continue;
      const p = ped.mesh.position;
      // Flee from a crime or from the player when they are wanted and close.
      if (crimePos && groundDistance(p.x, p.z, crimePos.x, crimePos.z) < 26) {
        ped.fleeing = true;
        ped.fleeTime = 3;
      }
      if (ped.fleeTime > 0) ped.fleeTime -= dt;
      else ped.fleeing = false;
      let speed = ped.fleeing ? 5.5 : ped.speed;
      let angle;
      if (ped.fleeing && playerPos) {
        angle = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      } else {
        angle = ped.alongAvenue ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        // At a corner, sometimes turn.
        const coord = ped.alongAvenue ? p.z : p.x;
        if (CITY.streets.some((s) => Math.abs(coord - s) < 0.6) && rng.chance(0.01)) {
          ped.alongAvenue = !ped.alongAvenue;
          ped.dir = rng.chance(0.5) ? 1 : -1;
        }
      }
      p.x += Math.sin(angle) * speed * dt;
      p.z += Math.cos(angle) * speed * dt;
      if (Math.abs(p.x) > 300 || Math.abs(p.z) > 300) {
        const spot = randomSidewalkSpot();
        p.x = spot.x; p.z = spot.z;
        ped.alongAvenue = spot.alongAvenue;
      }
      ped.mesh.rotation.y = angle;
      ped.walkPhase += dt * speed * 3.2;
      const swing = Math.sin(ped.walkPhase) * 0.5;
      const legL = ped.mesh.getObjectByName('legL');
      const legR = ped.mesh.getObjectByName('legR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (ped.attacker) {
        // Attackers stand their ground and shoot at the player.
        ped.shootCooldown -= dt;
      }
    }
  }

  return {
    peds,
    step,
    spawnAttacker(x, z) {
      const ped = spawnPed(true);
      ped.mesh.position.set(x, 0, z);
      ped.speed = 0;
      ped.fleeing = false;
      return ped;
    },
    spawnTaxiFare(x, z) {
      const ped = spawnPed(false);
      ped.mesh.position.set(x, 0, z);
      ped.speed = 0;
      ped.isTaxiFare = true;
      return ped;
    },
    /** The nearest living ped within `radius` of a point. */
    nearest(x, z, radius, onlyAttackers = false) {
      let best = null; let bestD = radius;
      for (const ped of peds) {
        if (!ped.alive) continue;
        if (onlyAttackers && !ped.attacker) continue;
        const d = groundDistance(ped.mesh.position.x, ped.mesh.position.z, x, z);
        if (d < bestD) { bestD = d; best = ped; }
      }
      return best;
    },
    remove(ped) {
      ped.alive = false;
      scene.remove(ped.mesh);
    },
  };
}
