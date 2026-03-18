# Claude Jump — Developer Guide

A pixel-art browser game where you play as Claude navigating a world full of
AI/CLI obstacles. Built with vanilla JavaScript and HTML5 Canvas.

## Running the Game

Open `public/index.html` in any modern browser. No build step required.

For local development with live reload, use any static file server:
```bash
npx serve public
# or
python3 -m http.server 8080 --directory public
```

## Architecture

```
public/
  index.html       — Single-page entry point
  style.css        — Layout, fonts, responsive rules
  game.js          — All game logic (~1300 lines)
  music/           — Audio assets (BGM + SFX)
spec/
  game.spec.js     — Behavioural specs (runnable in Node or browser)
  index.html       — Browser test runner
CLAUDE.md          — This file
```

### game.js Structure

| Section | Lines | Purpose |
|---------|-------|---------|
| Canvas & Audio init | 1–30 | DOM refs, audio objects |
| Sprites | 122–204 | Pixel-map definitions + `drawSprite()` |
| Effects | 206–263 | `FloatingText`, `Particle` classes |
| Entities | 265–480 | `Player`, `Obstacle`, `Collectible` classes |
| Level 3 (Vertical) | 481–680 | `Platform` class, `initVertical`, `spawnPlatform`, `updateVertical`, `drawVertical` |
| Core Logic | 726–900 | `resetGame`, `die`, `handleInput`, event listeners |
| Game Loop | 900–1280 | `loop()` — main RAF loop, level transitions |

## Levels

| Level | Trigger | Mode | Theme |
|-------|---------|------|-------|
| 1 | Start | Horizontal runner | Classic bugs + sinkholes |
| 2 | Score ≥ 500 | Horizontal runner | Synthwave / corrupted weights |
| 3 | Score ≥ 1500 | Vertical platformer | Escape the Matrix |

## Enemy Roster

### Horizontal Mode (Levels 1 & 2)

| Type | Level | Behaviour | CLI Metaphor |
|------|-------|-----------|--------------|
| `bug` | 1+ | Ground crawler, bobs up/down | Generic software bug |
| `fly` | 1+ | Airborne, sine-wave bounce | Intermittent / flaky error |
| `hole` | 1+ | Sinkhole — player falls through | Null pointer / void |
| `glitch` | 2 | Fast random jitter, cyberpunk colours | Corrupted model weights |
| `rate_limit` | 1 late / 2 | Wide pulsing red wall labelled "429" | Anthropic rate limit |
| `timeout` | 2 | 2.5× speed, orange, speed trails | API / tool call timeout |
| `hallucination` | 2 | Looks identical to gold token; brief purple flicker is the only tell | Model hallucination |

### Vertical Mode (Level 3 — Platform Types)

| Type | Colour | Effect | CLI Metaphor |
|------|--------|--------|--------------|
| `normal` | Blue | Safe bounce | Stable prompt |
| `moving` | Purple | Bounces around | Non-deterministic output |
| `enemy` | Red | −50 score, labelled (e.g. RATE LIMIT / TOOL DENIED) | CLI error |
| `boost` | Green | +100 score, super-high bounce | GPU acceleration |

### Adding a New Enemy

1. **Add a constructor branch** in `Obstacle.constructor()`:
   ```js
   } else if (this.type === 'my_enemy') {
       this.width = 10 * PIXEL_SIZE;
       this.height = 8 * PIXEL_SIZE;
       this.y = GROUND_Y - this.height;
   }
   ```

2. **Add update logic** in `Obstacle.update()`:
   ```js
   } else if (this.type === 'my_enemy') {
       // custom movement
   }
   ```

3. **Add draw logic** in `Obstacle.draw()`:
   ```js
   } else if (this.type === 'my_enemy') {
       ctx.save();
       // draw using ctx API or drawSprite()
       ctx.restore();
   }
   ```

4. **Wire into spawn logic** inside `loop()` → obstacle spawn block.

5. **Write a spec** in `spec/game.spec.js` describing expected behaviour.

## Collectibles

| Type | Rarity | Effect |
|------|--------|--------|
| `token` | 65% | +50 × combo points |
| `context` | 10% | Game speed −2 (context expansion) |
| `gpu` | 5% | 400-frame invincibility (AGI MODE) |
| `corrupted` | 20% | −500 score, 3 s speed madness |

## Score & Progression

- Passive: +0.05 / frame
- Token collect: +50 × combo
- Missing a token: −100 (combo resets)
- Corrupted token: −500 + speed boost debuff
- Invincible smash: +100 per obstacle

Combo milestones trigger meme messages:
- ×3 → FEW SHOT!
- ×5 → ZERO SHOT!
- ×10 → CHAIN OF THOUGHT!

## Physics Constants

```js
const GRAVITY = 0.6;          // Applied every frame
const JUMP_FORCE = -10;       // Applied on jump
// Level 3 uses GRAVITY * 0.7 for floatier platforming
```

## Spec-Driven Development

Behavioural specs live in `spec/game.spec.js`. Run them:

```bash
# Node
node spec/game.spec.js

# Browser
open spec/index.html
```

Write the spec **before** implementing the feature. Specs cover:
- Collision detection
- Enemy dimensions / speeds
- Level progression thresholds
- Score mechanics
- Platform type behaviours
- Physics (gravity, jump force, landing)

## Known Constraints

- Single JS file, no bundler — keep it simple.
- Pixel art uses a 4px `PIXEL_SIZE` grid; sprites are string arrays.
- `drawSprite()` supports colours `1 3 4 5 6`; use `ctx` directly for text/custom shapes.
- Mobile: address-bar resize is intentionally ignored (±150 px threshold).
