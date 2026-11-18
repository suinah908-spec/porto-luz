// The wanted system: stars, police cars that chase and ram, and the helicopter
// that arrives at three stars. Heat rises with crimes and falls when the player hides.
import { WANTED } from './config.js';
import { clamp, createRandom, groundDistance, wrapAngle } from './random.js';
import { createCarMesh, driveCar } from './vehicles.js';

const THREE = window.THREE;

/** A police helicopter: body, tail, spinning rotor and a searchlight cone. */
function createHelicopter(scene) {
  const group = new THREE.Group();
  group.name = 'police-helicopter';
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), bodyMat);
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 6), bodyMat);
  tail.position.set(0, 0.3, -5);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.position.y = 1.1;
  rotor.name = 'rotor';
  group.add(rotor);
  const light = new THREE.Mesh(
    new THREE.ConeGeometry(6, 26, 16, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
  );
  light.position.y = -13;
  light.rotation.x = Math.PI;
  group.add(light);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x999966 }));
  lamp.position.set(0, -0.9, 2.4);
  group.add(lamp);
  scene.add(group);
  return { mesh: group, rotor, angle: 0, orbit: 0 };
}

export function createPolice(scene, seed) {
  const rng = createRandom(seed + 271);
  return {
    stars: 0,
    heat: 0,
    decayTimer: 0,
    bustTimer: 0,
    cars: [],
    heli: null,
    sirenPhase: 0,

    /** A crime was committed: raise the heat. Returns the new star count. */
    addCrime(kind) {
      const weight = { steal: 1, assault: 1, shooting: 2, hitPed: 2, ramPolice: 1, speeding: 0 }[kind] ?? 1;
      this.heat = Math.min(WANTED.maxStars, this.heat + weight);
      this.stars = Math.ceil(this.heat);
      this.decayTimer = 0;
      return this.stars;
    },
    clear() {
      this.stars = 0;
      this.heat = 0;
      this.decayTimer = 0;
      this.bustTimer = 0;
      for (const c of this.cars) scene.remove(c.mesh);
      this.cars = [];
      if (this.heli) { scene.remove(this.heli.mesh); this.heli = null; }
    },

    step(dt, playerPos, playerInCar, colliders, onBusted, onDamage) {
      // Spawn police to match the stars.
      const wanted = WANTED.policePerStar[this.stars] || 0;
      while (this.cars.length < wanted) {
        const mesh = createCarMesh('police');
        const angle = rng.range(0, Math.PI * 2);
        const dist = rng.range(45, 70);
        mesh.position.set(playerPos.x + Math.sin(angle) * dist, 0, playerPos.z + Math.cos(angle) * dist);
        scene.add(mesh);
        this.cars.push({
          mesh, kind: 'police', angle: 0, speed: 0, isPlayer: false, isPolice: true,
          ramCooldown: 0,
        });
      }
      while (this.cars.length > wanted) {
        const gone = this.cars.pop();
        scene.remove(gone.mesh);
      }
      // Helicopter at three stars and up.
      if (this.stars >= WANTED.heliAtStars && !this.heli) this.heli = createHelicopter(scene);
      if (this.stars < WANTED.heliAtStars && this.heli) { scene.remove(this.heli.mesh); this.heli = null; }
      if (this.heli) {
        this.heli.orbit += dt * 0.35;
        const h = this.heli.mesh;
        h.position.set(
          playerPos.x + Math.sin(this.heli.orbit) * 26,
          46,
          playerPos.z + Math.cos(this.heli.orbit) * 26,
        );
        h.rotation.y = this.heli.orbit + Math.PI / 2;
        this.heli.rotor.rotation.y += dt * 22;
      }

      // Chase: steer toward the player and ram.
      let nearestPolice = Infinity;
      for (const car of this.cars) {
        const p = car.mesh.position;
        const dx = playerPos.x - p.x;
        const dz = playerPos.z - p.z;
        const dist = Math.hypot(dx, dz);
        nearestPolice = Math.min(nearestPolice, dist);
        const targetAngle = Math.atan2(dx, dz);
        car.angle += clamp(wrapAngle(targetAngle - car.angle), -2.4 * dt, 2.4 * dt);
        car.speed += (30 - car.speed) * Math.min(1, dt * 0.8);
        p.x += Math.sin(car.angle) * car.speed * dt;
        p.z += Math.cos(car.angle) * car.speed * dt;
        car.mesh.rotation.y = car.angle;
        for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
        // Ram the player's car or knock the player down.
        car.ramCooldown = Math.max(0, car.ramCooldown - dt);
        if (dist < 4.2 && car.ramCooldown <= 0) {
          car.ramCooldown = 1.2;
          car.speed *= 0.5;
          if (playerInCar) {
            playerInCar.speed *= 0.55;
            onDamage(6);
          } else {
            onDamage(12);
          }
        }
        // Flashing light bar.
        this.sirenPhase += dt * 8;
        const red = car.mesh.getObjectByName('light-red');
        const blue = car.mesh.getObjectByName('light-blue');
        const on = Math.sin(this.sirenPhase) > 0;
        if (red) red.material.emissive.setHex(on ? 0xff0000 : 0x330000);
        if (blue) blue.material.emissive.setHex(on ? 0x000033 : 0x0044ff);
      }

      // Busted: a police car sits on the player on foot.
      if (!playerInCar && nearestPolice < WANTED.bustDistance) {
        this.bustTimer += dt;
        if (this.bustTimer >= WANTED.bustSeconds) onBusted();
      } else {
        this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
      }

      // Heat decays when no police is close enough to see the player.
      if (this.stars > 0) {
        if (nearestPolice > 55) {
          this.decayTimer += dt;
          if (this.decayTimer >= WANTED.decaySecondsPerStar) {
            this.decayTimer = 0;
            this.heat = Math.max(0, this.heat - 1);
            this.stars = Math.ceil(this.heat);
          }
        } else {
          this.decayTimer = 0;
        }
      }
      return nearestPolice;
    },
  };
}
