// The story: twelve missions for Mara Voss, plus taxi fares and courier runs that
// keep the cash flowing between them. Each objective is one of a small set of kinds
// (goto, pickup, steal, tail, defend, escape, race, cooldown), so the engine stays
// simple while the missions themselves stay varied.
import { CITY, MISSIONS, SAFEHOUSES } from './config.js';
import { createRandom, groundDistance } from './random.js';
import { createCarMesh } from './vehicles.js';

const THREE = window.THREE;

export function createMissions(game) {
  const rng = createRandom(4242);
  let current = -1; // index into MISSIONS, -1 = free roam
  let step = 0;
  let stepTimer = 0;
  let tailTime = 0;
  let tailCar = null;
  let attackersLeft = 0;
  let raceIndex = 0;
  let raceTimer = 0;
  let carrying = false;
  let job = null; // { kind: 'taxi'|'courier', phase, ped, target, payout }
  let jobCooldown = 8;

  function playerPos() {
    return { x: game.player.x, z: game.player.z };
  }
  function objective() {
    if (current < 0) return null;
    return MISSIONS[current].objectives[step] || null;
  }
  function objectivePos() {
    const obj = objective();
    if (!obj) return null;
    if (obj.type === 'race') return obj.checkpoints[raceIndex] || null;
    if (obj.type === 'tail' && tailCar) return { x: tailCar.mesh.position.x, z: tailCar.mesh.position.z };
    return { x: obj.x, z: obj.z };
  }
  function objectiveText() {
    if (job) {
      if (job.phase === 'pickup') return job.kind === 'taxi' ? 'Pick up the fare' : 'Pick up the courier parcel';
      return job.kind === 'taxi' ? 'Drive the fare to the destination' : 'Deliver the parcel';
    }
    const obj = objective();
    if (!obj) return current < 0 ? 'Explore Porto Luz. Press M for a mission.' : 'Mission complete!';
    if (obj.type === 'race') return `${obj.text} — checkpoint ${raceIndex + 1}/${obj.checkpoints.length} (${Math.max(0, Math.ceil(raceTimer))}s)`;
    if (obj.type === 'tail') return `${obj.text} — ${Math.floor(tailTime)}/${obj.seconds}s`;
    if (obj.type === 'defend') return `${obj.text} — ${attackersLeft} left`;
    return obj.text;
  }
  function missionName() {
    if (job) return job.kind === 'taxi' ? 'TAXI FARE' : 'COURIER RUN';
    if (current < 0) return 'FREE ROAM';
    return `MISSION ${MISSIONS[current].id} — ${MISSIONS[current].title.toUpperCase()}`;
  }

  function startObjective() {
    const obj = objective();
    if (!obj) return;
    stepTimer = 0;
    tailTime = 0;
    raceIndex = 0;
    raceTimer = obj.type === 'race' ? obj.timeLimit : 0;
    if (obj.type === 'tail') {
      // A courier car to follow, driving a slow loop around Downtown.
      const mesh = createCarMesh('sedan', 0x2f2f38);
      mesh.position.set(0, 0, -140);
      game.scene.add(mesh);
      tailCar = {
        mesh, kind: 'sedan', alongAvenue: false, line: -140, dir: 1,
        speed: 11, cruise: 11, angle: Math.PI / 2, isPlayer: false, isPolice: false,
      };
      game.traffic.cars.push(tailCar);
    }
    if (obj.type === 'defend') {
      attackersLeft = obj.count;
      for (let i = 0; i < obj.count; i += 1) {
        const a = i * (Math.PI * 2 / obj.count);
        game.peds.spawnAttacker(obj.x + Math.cos(a) * 10, obj.z + Math.sin(a) * 10);
      }
    }
    if (obj.type === 'escape' && game.police.stars < 2) {
      game.police.addCrime('shooting');
      game.police.addCrime('shooting');
    }
  }

  function advanceStep() {
    const obj = objective();
    game.audio.pickup();
    step += 1;
    if (obj && (obj.type === 'pickup' || obj.type === 'steal')) carrying = true;
    if (!objective()) {
      completeMission();
      return;
    }
    startObjective();
  }

  function completeMission() {
    const mission = MISSIONS[current];
    game.player.cash += mission.payout;
    game.audio.missionComplete();
    game.hud.banner('MISSION COMPLETE', `${mission.title} — $${mission.payout}`);
    game.save.missionsDone = Math.max(game.save.missionsDone, mission.id);
    game.save.cash = game.player.cash;
    carrying = false;
    current = -1;
    step = 0;
    if (tailCar) { game.scene.remove(tailCar.mesh); tailCar = null; }
  }

  function failMission(reason) {
    game.hud.toast(`Mission failed — ${reason}`);
    if (tailCar) { game.scene.remove(tailCar.mesh); tailCar = null; }
    current = -1;
    step = 0;
    carrying = false;
  }

  function startMission(index) {
    if (current >= 0) return false;
    current = index;
    step = 0;
    carrying = false;
    const mission = MISSIONS[index];
    game.hud.banner(`MISSION ${mission.id} — ${mission.title}`, `${mission.giver}: ${mission.brief}`);
    startObjective();
    return true;
  }

  function startNextMission() {
    const next = game.save.missionsDone;
    if (next >= MISSIONS.length) {
      game.hud.toast('All twelve missions complete — you are a Porto Luz legend.');
      return false;
    }
    return startMission(next);
  }

  function startJob(kind) {
    if (job || current >= 0) return;
    const x = Math.round((rng.range(-4, 4))) * 70;
    const z = Math.round((rng.range(-4, 4))) * 70;
    const tx = Math.round((rng.range(-4, 4))) * 70;
    const tz = Math.round((rng.range(-4, 4))) * 70;
    job = {
      kind, phase: 'pickup',
      x, z, tx, tz,
      payout: kind === 'taxi' ? 80 + rng.int(0, 60) : 120 + rng.int(0, 80),
      ped: kind === 'taxi' ? game.peds.spawnTaxiFare(x, z) : null,
    };
    game.hud.toast(kind === 'taxi' ? 'Taxi fare waiting — pick them up.' : 'Courier parcel waiting — pick it up.');
  }

  function update(dt) {
    // Side jobs appear in free roam.
    if (!job && current < 0) {
      jobCooldown -= dt;
      if (jobCooldown <= 0) {
        jobCooldown = 45;
        startJob(rng.chance(0.5) ? 'taxi' : 'courier');
      }
    }
    const pos = playerPos();
    // Side job progress.
    if (job) {
      const target = job.phase === 'pickup' ? { x: job.x, z: job.z } : { x: job.tx, z: job.tz };
      if (groundDistance(pos.x, pos.z, target.x, target.z) < 7) {
        if (job.phase === 'pickup') {
          job.phase = 'dropoff';
          if (job.ped) { game.peds.remove(job.ped); job.ped = null; }
          game.audio.pickup();
          game.hud.toast(job.kind === 'taxi' ? 'Fare aboard — drive to the marker.' : 'Parcel collected — deliver it.');
        } else {
          game.player.cash += job.payout;
          game.save.cash = game.player.cash;
          game.audio.missionComplete();
          game.hud.banner('JOB DONE', `+$${job.payout}`);
          job = null;
          jobCooldown = 30;
        }
      }
    }
    if (current < 0) return;
    const obj = objective();
    if (!obj) return;
    stepTimer += dt;
    if (obj.type === 'goto' || obj.type === 'pickup' || obj.type === 'deliver' || obj.type === 'escape') {
      if (obj.type === 'escape' && game.police.stars < 2 && stepTimer > 2) {
        // The heat faded before the player arrived: still counts as reaching it.
      }
      if (groundDistance(pos.x, pos.z, obj.x, obj.z) < (obj.radius || 8)) {
        if (obj.type === 'escape' && game.police.stars < 2) {
          // Reached the safehouse cold: the chase part is done, move on.
        }
        advanceStep();
      }
    } else if (obj.type === 'steal') {
      if (game.player.inCar && game.player.inCar.kind === obj.carClass) advanceStep();
    } else if (obj.type === 'tail') {
      if (!tailCar) { failMission('the courier got away'); return; }
      const tp = tailCar.mesh.position;
      const d = groundDistance(pos.x, pos.z, tp.x, tp.z);
      if (d > 12 && d < 45) {
        tailTime += dt;
        if (tailTime >= obj.seconds) {
          const idx = game.traffic.cars.indexOf(tailCar);
          if (idx >= 0) game.traffic.cars.splice(idx, 1);
          game.scene.remove(tailCar.mesh);
          tailCar = null;
          advanceStep();
        }
      } else if (d < 8) {
        tailTime = Math.max(0, tailTime - dt * 2);
        game.hud.toast('Too close — the courier is getting suspicious!');
      }
      // The courier drives a slow loop; keep it moving along its street.
      tailCar.speed = 11;
      tailCar.mesh.position.x += Math.sin(tailCar.angle) * tailCar.speed * dt;
      tailCar.mesh.position.z += Math.cos(tailCar.angle) * tailCar.speed * dt;
      if (Math.abs(tailCar.mesh.position.x) > 260 || Math.abs(tailCar.mesh.position.z) > 260) {
        tailCar.angle += Math.PI / 2;
        tailCar.mesh.rotation.y = tailCar.angle;
      }
    } else if (obj.type === 'defend') {
      const remaining = game.peds.peds.filter((p) => p.alive && p.attacker).length;
      attackersLeft = remaining;
      if (remaining === 0) advanceStep();
    } else if (obj.type === 'race') {
      raceTimer -= dt;
      const cp = obj.checkpoints[raceIndex];
      if (cp && groundDistance(pos.x, pos.z, cp.x, cp.z) < 10) {
        raceIndex += 1;
        game.audio.pickup();
        if (raceIndex >= obj.checkpoints.length) advanceStep();
      }
      if (raceTimer <= 0) failMission('out of time');
    } else if (obj.type === 'cooldown') {
      if (game.police.stars === 0) advanceStep();
    }
  }

  return {
    update,
    startNextMission,
    startMission,
    missionName,
    objectiveText,
    objectivePos,
    get current() { return current; },
    get job() { return job; },
    get carrying() { return carrying; },
    /** Marker position for the HUD arrow / beacon: job, mission objective or safehouse. */
    markerPos() {
      if (job) {
        const t = job.phase === 'pickup' ? { x: job.x, z: job.z } : { x: job.tx, z: job.tz };
        return t;
      }
      const p = objectivePos();
      if (p) return p;
      return SAFEHOUSES[0];
    },
  };
}
