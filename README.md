# DragonSit 🐉

A cosy dragon city-builder and breeding game that runs entirely in the browser and is built for iPhone.
Raise dragons in element habitats, feed them to level up, breed hybrids, hatch eggs, expand your island and take your team into turn-based battles.

**No build step, no dependencies, no image files.** Every dragon, egg and building is drawn procedurally as SVG.

## Play it online

The game is a static site, so it deploys to GitHub Pages automatically with the included workflow.

1. On GitHub open **Settings → Pages** and under *Build and deployment* set **Source** to **GitHub Actions** (the workflow also tries to enable this for you on its first run).
2. Every push to `main`, `master` or a `claude/**` branch runs `.github/workflows/pages.yml` and publishes the site.
3. Your game is then live at `https://<your-username>.github.io/DragonSit/` (for this repo: **https://cmizz24.github.io/DragonSit/**).

> GitHub Pages is free for public repositories. A private repository needs a paid GitHub plan for Pages.

### Install it on your iPhone

1. Open the link above in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**.
3. Launch it from the home screen: it runs fullscreen like a native app, works offline, and your progress is saved on the device.

Use **Settings → Export save** to copy your progress to another device.

## Play it locally

Any static file server works (ES modules need `http://`, not `file://`):

```bash
npx serve .          # or: python3 -m http.server 8080
```

Then open the printed URL. On a phone on the same Wi-Fi, open your computer's IP address instead of `localhost`.

## The game

| System | What it does |
| --- | --- |
| **10 elements** | Fire, Earth, Water, Nature, Electric, Ice, Metal, Dark, Light and Legend, each with strengths and weaknesses. |
| **55 dragon species** | 9 pure, 36 rare hybrids, 6 three-element epics and 4 legendaries, each with three growth stages (baby, young, adult). |
| **Habitats** | One per element. Dragons living there earn gold over time, capped per habitat; upgrade for more nests and higher caps. |
| **Farms & feeding** | Grow crops for food, feed dragons to level them up. Temples raise the level cap from 10 up to 30. |
| **Breeding Mountain** | Pair two level-3+ dragons. Offspring inherit elements from both parents; rarer parents raise the odds of epics and legendaries. |
| **Hatchery** | Bought and bred eggs incubate here, then hatch into a matching habitat. |
| **Battles** | 3v3 turn-based fights with four moves per dragon, element multipliers, criticals, speed order and switching. A 30-stage campaign with bosses, plus an arena with leagues and trophies. |
| **Island** | Isometric map with pinch-zoom and drag, five purchasable land expansions, decorations, move/sell buildings. |
| **Progression** | Player levels unlock content, 26 quests double as a tutorial, a daily chest, offline gold earnings, and gem speed-ups for timers. |

## Project layout

```
index.html                 app shell
css/style.css              all styling (mobile-first, safe-area aware)
src/main.js                entry point, placement bar, level-up dialogs
src/game.js                central game object (state, island, ticks, saves)
src/state.js               default state, save/load/migrate/export/import
src/actions.js             every state mutation (build, buy, feed, breed, battle rewards...)
src/economy.js             formulas (stats, xp, costs, rates)
src/breeding.js            breeding outcome odds
src/battle.js              turn-based battle engine (pure logic)
src/island.js              isometric canvas renderer + touch input
src/art/                   procedural SVG dragons, eggs and buildings
src/data/                  elements, dragons, buildings, quests, campaign
src/ui/                    HUD and all panels (shop, dragons, buildings, breeding, battle, quests, settings)
sw.js, manifest.webmanifest  PWA offline support and home-screen install
tools/                     Playwright scripts used to render icons and smoke-test the game
```

## Testing

`tools/play.mjs` drives the whole game in an emulated iPhone with Playwright (globally installed) and takes screenshots:

```bash
node tools/play.mjs smoke ./screenshots
```
