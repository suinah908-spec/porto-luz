// PORTO LUZ v2.1 — every tuning number, colour, district and story mission, in one place.
// Porto Luz — every tuning number, colour, district and story mission in one place.
// The city is a 630 m grid of avenues and streets; the beach is south, the harbour west.
export const STEP = 1 / 60;
export const CITY = {
  half: 315,
  roadHalf: 7,
  avenues: [-280, -210, -140, -70, 0, 70, 140, 210, 280],
  streets: [-280, -210, -140, -70, 0, 70, 140, 210, 280],
  beachZ: 315,
  harbourX: -315,
};

export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 11,
  radius: 0.9,
  health: 100,
  punchDamage: 25,
  punchRange: 2.2,
  pistolDamage: 34,
  pistolRange: 60,
  pistolAmmo: 12,
};

export const CAR = {
  // Arcade handling per class.
  sedan: { accel: 14, topSpeed: 30, brake: 26, turn: 1.9, grip: 6 },
  sports: { accel: 22, topSpeed: 42, brake: 32, turn: 2.4, grip: 8 },
  taxi: { accel: 13, topSpeed: 28, brake: 26, turn: 1.9, grip: 6 },
  truck: { accel: 9, topSpeed: 22, brake: 20, turn: 1.4, grip: 5 },
  police: { accel: 20, topSpeed: 38, brake: 30, turn: 2.3, grip: 8 },
};

export const WANTED = {
  maxStars: 5,
  decaySecondsPerStar: 14,
  policePerStar: [0, 1, 2, 3, 4, 5],
  heliAtStars: 3,
  bustDistance: 3.2,
  bustSeconds: 1.6,
};

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8d0e8,
  sun: 0xfff2d0,
  ocean: 0x1e7fa8,
  sand: 0xe8d29a,
  grass: 0x7fae5a,
  asphalt: 0x2e3138,
  sidewalk: 0x9aa0a8,
  building: [0xe8b04b, 0xd96a4f, 0x4f8fd9, 0x7fb069, 0xc96a9b, 0xf2e3c9, 0x8a7fbf, 0xe07856],
  downtown: [0x5a6b7f, 0x7f8ea3, 0x9fb3c8, 0x4a5a6e],
  playerJacket: 0x2f9e6e,
  policeWhite: 0xf2f2f2,
  policeBlack: 0x1c1f26,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save game lives in this browser only. */
export const SAVE_KEY = 'porto-luz.save.v1';

/** The crew and the story: Mara Voss, getaway driver, proving herself in Porto Luz. */
export const CREW = {
  hero: 'Mara Voss',
  fixer: 'Dario Marin',
  hacker: 'Luz Ferreira',
  muscle: 'Tomas "El Toro" Rocha',
};

/**
 * The 13 story missions. Objective kinds:
 *  goto    — reach the marker (radius m)
 *  pickup  — reach the marker, then the next objective becomes the delivery
 *  tail    — stay 12–45 m behind the target car for `seconds`
 *  defend  — defeat `count` attackers at the marker
 *  escape  — reach the safehouse while wanted >= 2, then lose all wanted
 *  race    — drive through the checkpoints in order before `timeLimit`
 *  deliver — reach the marker carrying the package
 * Positions are city coordinates (x east, z south); the beach is +z, the harbour -x.
 */
export const MISSIONS = [
  { id: 1, title: 'First Gear', giver: 'Dario Marin', payout: 250,
    brief: 'Dario wants to meet the new driver. Drive to the harbour docks and say hello.',
    objectives: [{ type: 'goto', x: -280, z: -70, radius: 8, text: 'Drive to the harbour meet' }] },
  { id: 2, title: 'Hot Wheels', giver: 'Dario Marin', payout: 400,
    brief: 'A sports car is parked on Beach Boulevard. Take it — any way you like — and bring it to the garage.',
    objectives: [
      { type: 'steal', carClass: 'sports', text: 'Steal a sports car (press E near one)' },
      { type: 'goto', x: 140, z: -210, radius: 9, text: 'Bring the car to the garage in Downtown' },
    ] },
  { id: 3, title: 'Paper Trail', giver: 'Luz Ferreira', payout: 450,
    brief: 'Luz left a package in Old Town. Pick it up and deliver it to the beach hotel. No questions.',
    objectives: [
      { type: 'pickup', x: -140, z: 0, radius: 7, text: 'Pick up the package in Old Town' },
      { type: 'deliver', x: 210, z: 280, radius: 8, text: 'Deliver the package to the beach hotel' },
    ] },
  { id: 4, title: 'Tail the Courier', giver: 'Dario Marin', payout: 600,
    brief: 'A courier is carrying the rival crew\'s ledger. Follow his car — close, but not so close he spots you.',
    objectives: [{ type: 'tail', seconds: 22, text: 'Tail the courier car (12–45 m) without being spotted' }] },
  { id: 5, title: "Luz's Backdoor", giver: 'Luz Ferreira', payout: 700,
    brief: 'Luz is cracking a server in Downtown and rivals are closing in on the street. Hold them off.',
    objectives: [{ type: 'defend', x: 70, z: -210, radius: 14, count: 4, text: 'Defeat the 4 rivals on the Downtown avenue' }] },
  { id: 6, title: 'The Getaway', giver: 'Dario Marin', payout: 800,
    brief: 'The job went loud. The police are on you — get to the safehouse and lose them.',
    objectives: [
      { type: 'escape', x: -210, z: 210, radius: 9, text: 'Reach the safehouse with the police on your tail' },
      { type: 'cooldown', text: 'Lose the wanted level — stay out of sight' },
    ] },
  { id: 7, title: 'Harbour Lights', giver: 'Tomas Rocha', payout: 900,
    brief: 'Toro bet the crew you can\'t beat his harbour circuit. Five checkpoints. Beat the clock.',
    objectives: [{ type: 'race', timeLimit: 75, checkpoints: [
      { x: -280, z: -210 }, { x: -140, z: -280 }, { x: 0, z: -140 }, { x: 140, z: -280 }, { x: 280, z: -140 },
    ], text: 'Race the harbour circuit — 5 checkpoints' }] },
  { id: 8, title: 'Cash Run', giver: 'Dario Marin', payout: 1200,
    brief: 'A bank courier is moving cash through Downtown. Take the case, then shake the heat.',
    objectives: [
      { type: 'pickup', x: 70, z: -140, radius: 7, text: 'Take the cash case in Downtown' },
      { type: 'escape', x: 210, z: 210, radius: 9, text: 'Reach the beach safehouse with the case' },
      { type: 'cooldown', text: 'Lose the wanted level' },
    ] },
  { id: 9, title: "Toro's Debt", giver: 'Tomas Rocha', payout: 1400,
    brief: 'Six rivals are waiting at the docks to collect Toro\'s debt. Go collect it from them instead.',
    objectives: [{ type: 'defend', x: -280, z: -140, radius: 16, count: 6, text: 'Defeat the 6 rivals at the docks' }] },
  { id: 10, title: 'The Long Way Home', giver: 'Luz Ferreira', payout: 1100,
    brief: 'A VIP needs to cross town in 90 seconds and must not be scared — no crashes, no police.',
    objectives: [
      { type: 'pickup', x: -210, z: 210, radius: 7, text: 'Pick up the VIP at the beach' },
      { type: 'race', timeLimit: 90, vip: true, checkpoints: [
        { x: -70, z: 70 }, { x: 70, z: -70 }, { x: 210, z: -210 },
      ], text: 'Drive the VIP to Downtown — gently, and on time' },
    ] },
  { id: 11, title: 'Smoke on the Water', giver: 'Dario Marin', payout: 1600,
    brief: 'Contraband is coming in by boat at the harbour. Move it inland while the helicopter circles.',
    objectives: [
      { type: 'pickup', x: -280, z: -210, radius: 8, text: 'Pick up the contraband at the harbour' },
      { type: 'deliver', x: -70, z: 140, radius: 8, text: 'Deliver it to the Old Town stash house' },
      { type: 'cooldown', text: 'Lose the wanted level' },
    ] },
  { id: 12, title: 'Porto Luz Grand Prix', giver: 'Dario Marin', payout: 3000,
    brief: 'The whole city is watching. Win the Grand Prix, then outrun the victory lap police and come home a legend.',
    objectives: [
      { type: 'race', timeLimit: 110, checkpoints: [
        { x: -280, z: 280 }, { x: -140, z: 0 }, { x: 0, z: -280 }, { x: 140, z: 0 }, { x: 280, z: 280 }, { x: 0, z: 140 },
      ], text: 'Win the Grand Prix — 6 checkpoints' },
      { type: 'escape', x: -210, z: 210, radius: 9, text: 'Outrun the police to the safehouse' },
      { type: 'cooldown', text: 'Lose the wanted level — you are a legend now' },
    ] },
  { id: 13, title: 'The Last Delivery', giver: 'Luz Ferreira', payout: 3500,
    brief: 'One last job before the crew goes quiet: Luz\'s master drive has to reach the Hills lookout in 100 seconds, and the whole city is awake. No mistakes.',
    objectives: [
      { type: 'pickup', x: 0, z: 0, radius: 7, text: 'Pick up the master drive in Old Town' },
      { type: 'race', timeLimit: 100, checkpoints: [
        { x: 140, z: 140 }, { x: 280, z: 70 }, { x: 280, z: -70 },
      ], text: 'Race the master drive to the Hills — 3 checkpoints' },
      { type: 'escape', x: 210, z: 210, radius: 9, text: 'Shake the heat and reach the Marina safehouse' },
      { type: 'cooldown', text: 'Lose the wanted level — the crew is free' },
    ] },
];

/** Radio stations: procedural WebAudio melodies (MIDI note numbers), one bar each, looped. */
export const RADIO = [
  { name: 'LUZ FM 101.5 — Synthwave', tempo: 112, bass: [45, 45, 48, 43], lead: [69, 72, 76, 74, 72, 69, 67, 64] },
  { name: 'PORTO CLASSICS 88.2', tempo: 92, bass: [41, 46, 43, 48], lead: [65, 69, 72, 69, 65, 62, 60, 64] },
  { name: 'BAY BEATS 96.0 — Electro', tempo: 128, bass: [38, 38, 41, 36], lead: [74, 74, 77, 76, 74, 71, 72, 74] },
];

export const SHOPS = [
  { x: -131, z: -35, name: 'Harbour Snacks', items: [
    { name: 'Snack (+25 health)', price: 10, health: 25 },
    { name: 'Armour vest (+50 armour)', price: 60, armour: 50 },
  ] },
  { x: 131, z: 105, name: 'Boulevard Paint Shop', items: [
    { name: 'Repaint car — Sunset Orange', price: 100, paint: 0xe07856 },
    { name: 'Repaint car — Ocean Teal', price: 100, paint: 0x2f9e8f },
  ] },
];

export const SAFEHOUSES = [
  { x: -210, z: 210, name: 'Beach Safehouse' },
  { x: 210, z: 210, name: 'Marina Safehouse' },
];
