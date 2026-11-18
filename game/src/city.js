// PORTO LUZ v2.1 — the city itself: ground, roads, five districts, beach and harbour.
// Porto Luz itself: the ground, the road grid, the five districts, the beach and
// the harbour, plus the collision boxes the rest of the game drives and walks
// against. Everything is built from one seeded RNG, so the same seed always
// builds the same city.
import { CITY, PALETTE } from './config.js';
import { createRandom } from './random.js';

const THREE = window.THREE;

/** A canvas texture of lit windows, tinted per material colour at build time. */
function facadeTexture(rng, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20242c';
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = rng.next() < litRatio;
      ctx.fillStyle = lit ? (rng.next() < 0.5 ? '#ffd98a' : '#9fd8ff') : '#11141b';
      ctx.fillRect(8 + col * 20, 10 + row * 20, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#23262c';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#e8c33a';
  ctx.fillRect(30, 0, 4, 28);
  ctx.fillStyle = '#c8ccd2';
  ctx.fillRect(2, 0, 2, 64);
  ctx.fillRect(60, 0, 2, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Which district a point is in: Downtown, Old Town, Beach, Harbour or the Hills. */
export function districtAt(x, z) {
  if (x < -210) return 'Harbour';
  if (z > 140) return 'Beach';
  if (z < -140 && Math.abs(x) <= 140) return 'Downtown';
  if (x > 210) return 'Hills';
  return 'Old Town';
}

/** True when the point is on a road (avenue or street). */
export function isOnRoad(x, z) {
  const r = CITY.roadHalf + 1;
  return CITY.avenues.some((a) => Math.abs(x - a) < r) || CITY.streets.some((s) => Math.abs(z - s) < r);
}

/**
 * Build the whole city into `scene` and return its collision boxes, clouds and
 * a few named places (garage, hospital, spawn) the missions and the player use.
 */
export function createCity(scene, seed) {
  const rng = createRandom(seed);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'PortoLuzCity';
  scene.add(group);

  // Sun, sky light and haze.
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.45);
  sun.position.set(180, 260, 120);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.8));
  scene.fog = new THREE.Fog(PALETTE.fog, 380, 900);
  scene.background = new THREE.Color(PALETTE.sky);

  // Base ground: grass inland, sand near the beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ color: 0x5d8f43 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  group.add(ground);

  // Beach sand and the ocean to the south.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 70),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 350);
  group.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 260),
    new THREE.MeshLambertMaterial({ color: PALETTE.ocean }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.0, 515);
  group.add(ocean);

  // Harbour water to the west.
  const harbourWater = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 760),
    new THREE.MeshLambertMaterial({ color: 0x2a6f8f }),
  );
  harbourWater.rotation.x = -Math.PI / 2;
  harbourWater.position.set(-375, 0.0, 0);
  group.add(harbourWater);

  // Roads: one long plane per avenue and street, with a repeating centre line.
  const roadTex = roadTexture();
  for (const a of CITY.avenues) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 44);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.roadHalf * 2, 640),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(a, 0.05, 0);
    group.add(road);
  }
  for (const s of CITY.streets) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 44);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(640, CITY.roadHalf * 2),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.06, s);
    group.add(road);
  }

  // Sidewalk slabs under each block.
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x7d838c });
  const blockGeo = new THREE.BoxGeometry(56, 0.3, 56);
  const facadeTex = facadeTexture(rng, 0.45);
  const facadeTexDowntown = facadeTexture(rng, 0.7);
  const buildingMats = PALETTE.building.map(
    (c) => new THREE.MeshLambertMaterial({ color: c, map: facadeTex }),
  );
  const downtownMats = PALETTE.downtown.map(
    (c) => new THREE.MeshLambertMaterial({ color: c, map: facadeTexDowntown }),
  );
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });

  // One or two buildings per block, taller Downtown, low and colourful in Old Town.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bi = 0; bi < 8; bi += 1) {
    for (let bj = 0; bj < 8; bj += 1) {
      const cx = -245 + bi * 70;
      const cz = -245 + bj * 70;
      const slab = new THREE.Mesh(blockGeo, sidewalkMat);
      slab.position.set(cx, 0.1, cz);
      group.add(slab);
      const district = districtAt(cx, cz);
      const count = district === 'Downtown' ? 1 : rng.chance(0.6) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = district === 'Downtown' ? rng.range(22, 30) : rng.range(12, 22);
        const d = district === 'Downtown' ? rng.range(22, 30) : rng.range(12, 22);
        const h = district === 'Downtown' ? rng.range(45, 95)
          : district === 'Beach' ? rng.range(14, 34)
          : district === 'Hills' ? rng.range(6, 12)
          : rng.range(8, 20);
        const ox = count === 1 ? 0 : (k === 0 ? -13 : 13);
        const oz = count === 1 ? 0 : (k === 0 ? 12 : -12);
        const mat = district === 'Downtown'
          ? downtownMats[rng.int(0, downtownMats.length - 1)]
          : buildingMats[rng.int(0, buildingMats.length - 1)];
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(cx + ox, h / 2 + 0.2, cz + oz);
        group.add(b);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.6, 0.6, d + 0.6);
        roof.position.set(cx + ox, h + 0.4, cz + oz);
        group.add(roof);
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
        // Rooftop water tank on the taller blocks.
        if (h > 20 && rng.chance(0.5)) {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 3, 10),
            new THREE.MeshLambertMaterial({ color: 0x8a94a3 }),
          );
          tank.position.set(cx + ox + w / 4, h + 2, cz + oz);
          group.add(tank);
        }
      }
    }
  }

  // Palm trees along the beach boulevard and the harbour promenade.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b45 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 8), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    for (let i = 0; i < 5; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 6), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.4, 7.6, z + Math.sin(a) * 1.4);
      leaf.rotation.z = Math.cos(a) * 0.9;
      leaf.rotation.x = -Math.sin(a) * 0.9;
      group.add(leaf);
    }
  }
  for (let x = -260; x <= 280; x += 35) palm(x, 296);
  for (let z = -260; z <= 260; z += 45) palm(-296, z);

  // Streetlights along the avenues.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xccaa44 });
  for (const a of CITY.avenues) {
    for (const s of [-210, 0, 210]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), poleMat);
      pole.position.set(a + 8, 3, s);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      lamp.position.set(a + 8, 6.2, s);
      group.add(lamp);
    }
  }

  // Harbour: docks, containers and cranes west of the city.
  const containerCols = [0xc94f38, 0x3f7fc9, 0x7fb069, 0xe8b04b];
  for (let i = 0; i < 14; i += 1) {
    const c = new THREE.Mesh(
      boxGeo,
      new THREE.MeshLambertMaterial({ color: containerCols[i % containerCols.length] }),
    );
    c.scale.set(12, 2.6, 2.6);
    c.position.set(-330 + rng.range(-8, 8), 1.5 + (i % 3) * 2.7, -260 + i * 38);
    group.add(c);
    colliders.push({ minX: c.position.x - 6, maxX: c.position.x + 6, minZ: c.position.z - 1.4, maxZ: c.position.z + 1.4 });
  }
  for (const z of [-180, 0, 180]) {
    const leg1 = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    leg1.scale.set(2, 34, 2); leg1.position.set(-330, 17, z - 8); group.add(leg1);
    const leg2 = leg1.clone(); leg2.position.set(-330, 17, z + 8); group.add(leg2);
    const beam = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    beam.scale.set(2, 2, 22); beam.position.set(-330, 33, z); group.add(beam);
  }

  // Drifting clouds.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rng.range(6, 12), 8, 6), cloudMat);
      puff.position.set(j * 8 - 12, rng.range(-1, 1), rng.range(-3, 3));
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(rng.range(-320, 320), rng.range(90, 130), rng.range(-320, 320));
    group.add(cloud);
    clouds.push(cloud);
  }

  return {
    colliders,
    group,
    clouds,
    /** Named places the missions use. */
    places: {
      spawn: { x: 0, z: 240 },
      garage: { x: 120, z: -180 },
      hospital: { x: -70, z: 70 },
    },
  };
}

/** Push a circle (x, z, radius) out of every building box it overlaps. Returns the new point. */
export function resolveBuildingCollisions(x, z, radius, colliders) {
  let pushed = false;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      // Move along the smallest penetration axis when the centre is inside the box.
      if (d2 < 0.0001) {
        const left = x - c.minX; const right = c.maxX - x;
        const top = z - c.minZ; const bottom = c.maxZ - z;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = c.minX - radius;
        else if (m === right) x = c.maxX + radius;
        else if (m === top) z = c.minZ - radius;
        else z = c.maxZ + radius;
      } else {
        x += (dx / d) * push;
        z += (dz / d) * push;
      }
      pushed = true;
    }
  }
  return { x, z, pushed };
}

/** Clamp a point into the playable land (not into the sea or past the harbour water). */
export function clampToLand(x, z) {
  return {
    x: Math.max(-308, Math.min(308, x)),
    z: Math.max(-308, Math.min(308, z)),
  };
}
