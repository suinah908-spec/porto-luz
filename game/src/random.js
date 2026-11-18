// Seeded randomness for Porto Luz: mulberry32, so one seed always builds the
// same city, the same traffic and the same screenshot scenes.
export function createRandom(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) { return min + next() * (max - min); },
    /** An integer in [min, max]. */
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    /** One element of `items`. */
    pick(items) { return items[Math.floor(next() * items.length)]; },
    /** True with probability `p`. */
    chance(p) { return next() < p; },
  };
}

/** Clamp `v` into [min, max]. */
export function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

/** Wrap an angle into [-PI, PI]. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Distance on the ground plane between two {x, z} points. */
export function groundDistance(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}
