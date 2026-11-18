# PORTO LUZ

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/suinah908-spec/porto-luz/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/suinah908-spec/porto-luz/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime game built for the [make.fun](https://make.fun) bounty
["Make GTA 6" (gta6-01)](https://make.fun/bounty/gta6-01).

You are **Mara Voss**, a driver for Dario Marin's crew in **Porto Luz** — a sun-soaked
coastal city of five districts, a beach to the south and a harbour to the west. Walk the
streets, steal cars, outrun the Porto Luz police (and their helicopter at three stars),
and run thirteen story missions to climb from wheelwoman to the crew's most trusted
driver. Everything is an original creation: the city, the characters, the story and the
music are all ours — no Rockstar assets, names or maps.

## Play it

No build step, no network, no install. The game is plain static files under `game/`
(plus the vendored Three.js library), so any desktop Chrome can run it offline:

```sh
# Option 1 — serve it locally
node serve.ts
# then open http://localhost:8080

# Option 2 — open the file directly
open game/index.html
```

Progress saves to your browser's local storage, so you can pick up where you left off.

## Controls

| Key | Action |
| --- | ------ |
| W A S D / arrow keys | Move on foot / drive |
| Shift | Sprint |
| Space | Brake (in a car) |
| E | Enter a car — steal it if it has a driver |
| F | Punch |
| H | Horn |
| R | Change radio station |
| M | Mission details |
| N | Mute |
| P or Esc | Pause |
| Enter | Confirm |
| Mouse drag / wheel | Orbit the camera / zoom |

## What's in the city

- **13 story missions** for Dario Marin, Luz Ferreira and Tomas Rocha — from
  *First Gear* to *The Last Delivery*, including tailing, getaways, a harbour job,
  a cash run and the Porto Luz Grand Prix:
  1. First Gear · 2. Hot Wheels · 3. Paper Trail · 4. Tail the Courier ·
  5. Luz's Backdoor · 6. The Getaway · 7. Harbour Lights · 8. Cash Run ·
  9. Toro's Debt · 10. The Long Way Home · 11. Smoke on the Water ·
  12. Porto Luz Grand Prix · 13. The Last Delivery
- **Side work between missions:** taxi fares and courier runs that keep the cash flowing.
- **Wanted system:** 1–5 stars. Police cars chase and ram; the helicopter arrives
  at three stars. Heat falls when you lay low.
- **A living city:** traffic, pedestrians who flee crimes, five districts, a beach
  and a harbour — all built from one seeded RNG, so the same seed always builds
  the same city.
- **Shops and safehouses:** buy snacks and armour, repaint your ride at the
  Boulevard Paint Shop, and lay low at the Beach or Marina Safehouse.
- **Radio:** three synthesized stations — LUZ FM 101.5 (synthwave),
  PORTO CLASSICS 88.2 and BAY BEATS 96.0 (electro). All sound is synthesized with
  WebAudio; there are no audio files and nothing is fetched.
- **HUD:** cash, health, wanted stars, mission objective, speedometer, live
  minimap and a mission counter.

## Screenshots

The cover and gameplay shots live in `screenshots/` — real captures of the game
running in desktop Chrome. `shots.json` lists the four scenes they were taken from.

## How it is built

- `game/index.html` — the page, HUD and overlays.
- `game/src/` — the game, split into one module per job: `main.js` (boot and loop),
  `city.js` (the world), `config.js` (tuning and missions), `player.js`,
  `vehicles.js`, `police.js`, `pedestrians.js`, `missions.js`, `hud.js`,
  `input.js`, `audio.js`, `random.js` (seeded RNG) and `shots.js` (screenshot scenes).
- `game/vendor/` — Three.js, vendored so the game runs offline.
- `main.ts` — the make.fun entry program (Node 22, standard library only): copies
  `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `serve.ts` — a tiny static server for local play.

## make.fun

This entry was built for the make.fun bounty
[Make GTA 6 (gta6-01)](https://make.fun/bounty/gta6-01).
If you want to try bounties yourself, sign up through my referral link:
**https://make.fun/r/16qhbw0b** (referral code `16qhbw0b`).

## License

MIT — see [LICENSE](LICENSE).
