# DragonSit 🐉

A cosy dragon city-builder and breeding game that runs entirely in the browser and is built for iPhone.
Raise dragons in element habitats, feed them to level up, breed hybrids, hatch eggs, expand your island and take your team into turn-based battles.

**No build step, no image files.** Dragons and buildings are real-time 3D models built procedurally with [Three.js](https://threejs.org) (vendored in `vendor/`) and rendered with lighting and shadows: a spinnable model on every dragon's page, a 3D battle arena, and pre-rendered isometric sprites for the island map, shop and Dragon Book. Devices without WebGL fall back to the procedural SVG art.

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

## Playing with friends

Everything works without any server, through codes you send in Messages, WhatsApp or anything else:

- **Trainer cards**: tap *Friends → Share my card*. Friends paste the card to add you; they see your level, trophies, tower record, campaign progress and your best team, and can **battle your team** any time. Cards are snapshots, so re-share now and then.
- **Friends leaderboard**: everyone you've added is ranked by trophies and tower floor.
- **Daily gift codes**: *Friends → Send today's gift* makes a code for the day. Each friend who redeems it gets gems, gold and food (once per friend per day).
- **Compare records**: your win/loss record against each friend is tracked.

### Optional: live cloud leaderboard (5-minute setup)

With a free Firebase database everyone using the same URL gets a **global leaderboard**, can add friends by **ID**, and friends' cards refresh automatically.

1. Go to [console.firebase.google.com](https://console.firebase.google.com), create a project, then **Build → Realtime Database → Create database** (start in *test mode*).
2. Open the **Rules** tab and paste:
   ```json
   {
     "rules": {
       "players": { ".read": true, ".indexOn": ["trophies", "tower"], "$id": { ".write": true } }
     }
   }
   ```
3. Copy the database URL (looks like `https://your-project-default-rtdb.firebaseio.com`).
4. Either paste it into `src/config.js` (`CLOUD_URL`) and push, so every player gets it automatically, or have each player paste it under **Settings → Cloud sync**.

The cloud only ever stores trainer cards (name, level, trophies, best team). Anyone with the URL can read and write cards, which is fine for a friend group.

## The game

| System | What it does |
| --- | --- |
| **10 elements** | Fire, Earth, Water, Nature, Electric, Ice, Metal, Dark, Light and Legend, each with strengths and weaknesses. |
| **75 dragon species** | 9 pure, 36 rare hybrids, 18 three-element epics, 8 legendaries and 4 four-element mythics, each with three growth stages (baby, young, adult). |
| **Habitats** | One per element. Dragons living there earn gold over time, capped per habitat; upgrade for more nests and higher caps. |
| **Farms & feeding** | Grow crops for food, feed dragons to level them up. Five temples raise the level cap from 10 up to 40. |
| **Empowering & mastery** | From level 20, spend gold to give a dragon up to five stars (+8% stats and +10% gold each). Moves gain power at levels 10, 20, 30 and 40. |
| **Breeding Mountain** | Pair two level-3+ dragons. Offspring inherit elements from both parents; rarer parents raise the odds of epics, legendaries and mythics. |
| **Hatchery** | Bought and bred eggs incubate here, then hatch into a matching habitat. |
| **Campaign** | 60 stages across 12 areas with a boss every fifth stage, then **Heroic** mode (+10 levels, triple rewards). |
| **Arena** | Random opponents scaled to your team, seven leagues from Bronze to Mythic, win streak bonuses. |
| **Dragon Tower** | Endless floors with one team; damage carries between floors with a small heal after each win. Weekly best floor with a weekly chest. |
| **Three isles** | Home Isle, Sky Isle (level 12) and Ember Isle (level 20), each with five purchasable land areas and its own look. |
| **Crystal Mine** | Slowly digs up gems; upgrade to dig faster. |
| **Weekly events** | Each calendar week features one element: +50% gold from its habitats, 25% off its dragons, better odds breeding its hybrids. Same for everyone, so friends share events. |
| **Daily missions** | Three missions a day plus a bonus chest for finishing all of them. |
| **Achievements** | 20 tiered achievements paying gems. |
| **Quests, daily chest, offline earnings** | 38 quests double as a tutorial; a daily chest with streak bonuses; habitats keep earning while you're away. |

## Project layout

```
index.html                 app shell
css/style.css              all styling (mobile-first, safe-area aware)
src/main.js                entry point, placement bar, level-up dialogs
src/game.js                central game object (state, island, ticks, saves)
src/state.js               default state, save/load/migrate/export/import
src/actions.js             every state mutation (build, buy, feed, breed, battle rewards, tower, friends...)
src/economy.js             formulas (stats, xp, costs, rates)
src/breeding.js            breeding outcome odds
src/battle.js              turn-based battle engine (pure logic)
src/social.js              trainer cards and gift codes (no server needed)
src/cloud.js, src/config.js optional Firebase leaderboard sync
src/island.js              isometric canvas renderer + touch input (three isle themes)
src/art/three/             Three.js engine helpers, procedural 3D dragon and building models, live viewer, battle arena
src/art/sprites.js         renders 3D models to cached sprites (with lazy hydration) and falls back to SVG
src/art/                   procedural SVG dragons, eggs and buildings (fallback and egg art)
vendor/three.module.min.js Three.js r170 (MIT, see vendor/THREE-LICENSE)
src/data/                  elements, dragons, buildings, quests, campaign/tower, events, missions, achievements
src/ui/                    HUD and all panels (shop, dragons, buildings, breeding, battle, friends, quests, settings)
sw.js, manifest.webmanifest  PWA offline support and home-screen install
tools/                     Playwright scripts used to render icons and smoke-test the game
```

## Testing

`tools/play.mjs` drives the whole game in an emulated iPhone with Playwright (globally installed) and takes screenshots:

```bash
node tools/play.mjs smoke ./screenshots        # core loop: build, buy, hatch, feed, breed, battle
node tools/play-full.mjs ./screenshots         # friends, gifts, tower, missions, awards, isles, mine, empower, heroic
```
