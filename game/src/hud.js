// The HUD: cash, health, wanted stars, the mission objective, the speedometer,
// the minimap, prompts, banners and the shop. All DOM — the 3D canvas stays clean.
import { CITY, MISSIONS } from './config.js';

function $(id) { return document.getElementById(id); }

export function createHud() {
  let toastTimer = null;
  let bannerTimer = null;
  let minimapTick = 0;

  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  return {
    show, hide,
    setScreen(name) {
      // name: 'title' | 'play' | 'paused' | 'over' | 'shop'
      $('hud').classList.toggle('on', name === 'play');
      $('title').classList.toggle('hidden', name !== 'title');
      $('pause').classList.toggle('hidden', name !== 'paused');
      $('over').classList.toggle('hidden', name !== 'over');
      $('shop').classList.toggle('hidden', name !== 'shop');
      if (name === 'play') $('shop').classList.add('hidden');
    },
    toast(message, ms = 2600) {
      const el = $('toast');
      el.textContent = message;
      el.style.display = 'block';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = 'none'; }, ms);
    },
    banner(title, sub) {
      const el = $('banner');
      el.innerHTML = '';
      const t = document.createElement('div');
      t.textContent = title;
      el.appendChild(t);
      if (sub) {
        const s = document.createElement('small');
        s.textContent = sub;
        el.appendChild(s);
      }
      el.style.display = 'block';
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
    },
    setPrompt(text) {
      const el = $('prompt');
      if (text) { el.textContent = text; el.style.display = 'block'; }
      else el.style.display = 'none';
    },
    setOver(title, text) {
      $('over-title').textContent = title;
      $('over-text').textContent = text;
    },
    openShop(shop, cash, onBuy) {
      $('shop-title').textContent = shop.name;
      const box = $('shopitems');
      box.innerHTML = '';
      for (const item of shop.items) {
        const btn = document.createElement('button');
        btn.textContent = `${item.name} — $${item.price} (you have $${cash})`;
        btn.disabled = cash < item.price;
        btn.addEventListener('click', () => onBuy(item));
        box.appendChild(btn);
      }
      show('shop');
    },
    /** Per-frame HUD refresh from the shared game state. */
    update(G, dt) {
      $('cash').textContent = `$${Math.floor(G.player.cash)}`;
      $('healthfill').style.width = `${Math.max(0, G.player.health)}%`;
      $('armourfill').style.width = `${Math.max(0, Math.min(100, G.player.armour))}%`;
      $('ammo').textContent = G.player.armed
        ? `Pistol ${G.player.ammo} / 12 — click to shoot`
        : 'Unarmed — F to punch · find the pistol at the safehouse';
      $('missionsdone').textContent = `Missions ${G.save.missionsDone} / ${MISSIONS.length}`;
      const stars = '★'.repeat(G.police.stars) + '☆'.repeat(5 - G.police.stars);
      $('stars').textContent = stars;
      const mins = Math.floor(G.clockMinutes % 1440);
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      $('clock').textContent = `${hh}:${mm} · ${G.district}`;
      $('radio').textContent = G.audio.stationName();
      $('missionname').textContent = G.missions.missionName();
      $('objectivetext').textContent = G.missions.objectiveText();
      const marker = G.missions.markerPos();
      const dist = marker ? Math.round(Math.hypot(G.player.x - marker.x, G.player.z - marker.z)) : 0;
      $('objectivedist').textContent = marker ? `${dist} m away` : '';
      const kmh = G.player.inCar ? Math.round(Math.abs(G.player.inCar.speed) * 3.6) : Math.round(G.player.speed * 3.6);
      $('speed').textContent = String(kmh);
      $('speedunit').textContent = G.player.inCar
        ? `km/h · ${G.player.inCar.kind} · E to exit`
        : 'km/h · on foot · E near a car to enter';
      $('crosshair').style.display = G.player.armed && !G.player.inCar ? 'block' : 'none';
      minimapTick += 1;
      if (minimapTick % 3 === 0) this.drawMinimap(G);
    },
    /** Top-down map: roads, blocks, ocean, the player, the marker and police blips. */
    drawMinimap(G) {
      const canvas = $('minimap');
      const ctx = canvas.getContext('2d');
      const S = canvas.width;
      const scale = S / 700;
      const toMap = (x, z) => [(x + 350) * scale, (z + 350) * scale];
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = '#0e2f1e';
      ctx.fillRect(0, 0, S, S);
      // Ocean south, harbour west.
      ctx.fillStyle = '#1e7fa8';
      ctx.fillRect(0, toMap(0, 315)[1], S, S - toMap(0, 315)[1]);
      ctx.fillRect(0, 0, toMap(-315, 0)[0], S);
      // Blocks.
      ctx.fillStyle = '#3a3f47';
      for (const c of G.city.colliders) {
        const [x1, z1] = toMap(c.minX, c.minZ);
        const [x2, z2] = toMap(c.maxX, c.maxZ);
        ctx.fillRect(x1, z1, Math.max(1, x2 - x1), Math.max(1, z2 - z1));
      }
      // Roads.
      ctx.strokeStyle = '#8a8f96';
      ctx.lineWidth = 3;
      for (const a of CITY.avenues) {
        const [x] = toMap(a, 0);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
      }
      for (const s of CITY.streets) {
        const [, z] = toMap(0, s);
        ctx.beginPath(); ctx.moveTo(0, z); ctx.lineTo(S, z); ctx.stroke();
      }
      const dot = (x, z, colour, r) => {
        const [mx, mz] = toMap(x, z);
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(mx, mz, r, 0, Math.PI * 2); ctx.fill();
      };
      // Traffic and peds.
      for (const car of G.traffic.cars) {
        if (car.isPlayer) continue;
        dot(car.mesh.position.x, car.mesh.position.z, car.isPolice ? '#3f8cff' : '#dfe7ef', car.isPolice ? 4 : 2);
      }
      // Mission / job marker.
      const marker = G.missions.markerPos();
      if (marker) {
        const [mx, mz] = toMap(marker.x, marker.z);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, mz, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(mx, mz, 3, 0, Math.PI * 2); ctx.fill();
      }
      // The player, as a green arrow.
      const [px, pz] = toMap(G.player.x, G.player.z);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(Math.PI - G.player.angle);
      ctx.fillStyle = '#7cf29b';
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}
