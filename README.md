# Claude Jump 🦀

A 2D pixel-art endless runner game inspired by the Chrome Dinosaur game, featuring the Anthropic Claude CLI logo!

## 🎮 Game Logic & Features

The goal is to survive as long as possible by navigating Claude through an endless barrage of syntax errors, sinkholes, and floating bugs. The game constantly speeds up, pushing your reflexes to the limit!

### Core Mechanics
- **Controls**: Press `SPACE`, `ArrowUp`, or `TAP/CLICK` the screen to jump.
- **Dynamic Speed**: The game speed and background music steadily accelerate the longer you survive.
- **True Fullscreen**: Fully responsive `100vw/100vh` layout. Works perfectly on Desktop, Tablet, and Mobile devices.

### Obstacles
- **Ground Bugs**: Classic red syntax error bugs crawling along the ground. Jump over them!
- **Flying Bugs (Score > 300)**: Flapping red bugs that bounce up and down in a sine wave. Timing is everything!
- **Sinkholes (Score > 100)**: Procedurally generated gaps in the floor. If you miss your jump, Claude will plummet into the void.

## 🗺️ Levels

The game has three escalating levels. You need **1000 tokens** to advance from Level 1 → 2, and **2000 tokens** to advance from Level 2 → 3.

### Level 1 — The Bug Hunt
Classic horizontal endless runner set in a dark terminal. Dodge ground bugs, flying errors, and sinkholes while collecting tokens.

| Enemy | Description |
|-------|-------------|
| **Bug** | Red ground crawler — animated walk cycle with glowing eyes |
| **Fly** | Airborne sine-wave enemy — timing your jump is critical |
| **Sinkhole** | Gap in the floor — fall in and it's over |
| **Rate Limit** | Wide pulsing `429` wall with electric edges — requires a well-timed jump |

### Level 2 — Weights Corrupted
The world shifts to synthwave purple. New AI-themed enemies spawn alongside the old ones, speed increases, and chaos reigns.

| Enemy | Description |
|-------|-------------|
| **Glitch** | RGB channel-split block that jitters unpredictably — corrupted model weights |
| **Timeout** | Comet-shaped orange missile at 2.5× speed with trailing afterburners |
| **Hallucination** | Looks just like a golden GPU collectible; a brief purple flicker is the only tell |

### Level 3 — Escape the Matrix
The game flips to a **vertical platformer**. Claude falls upward through a matrix and must bounce between platforms before a rising death floor catches him.

| Platform | Colour | Effect |
|----------|--------|--------|
| Normal | Blue | Safe bounce |
| Moving | Purple | Drifts left/right — unpredictable |
| Enemy | Red | −50 score (labelled: RATE LIMIT / TOOL DENIED / etc.) |
| Boost | Green | +100 score + super-high bounce |

**Controls (Level 3):** `←` / `→` arrow keys to move. Bounce off platforms to survive. Collect cyan **floor-slow diamonds** on platforms to slow the rising death floor.

> Idle on the main menu for 10 seconds to watch an auto-play demo of all three levels!

## 🍓 Powerups & The Combo System

Collecting items builds your **Multiplier Combo** (x2, x3, x5...). Missing an item resets your combo back to 0!

- **Apples (Common)**: Grants `50 x Combo` points. Emits a tiny pixel explosion.
- **Blueberries (Rare - 20%)**: Triggers **TIME SLOW!** Drops the game speed and music tempo significantly, giving you breathing room.
- **Golden GPUs (Epic - 5%)**: Triggers **AGI MODE!** 
  - Claude flashes gold and rainbow colors.
  - Grants invincibility for ~7 seconds.
  - You can smash straight through bugs for `+100 points` each, triggering violent screen shakes and particle explosions!

## 🥚 Easter Eggs & Memes

We built this for the devs. Keep an eye out for these hidden touches:

- **Combo Memes**: Stringing together huge combos spawns floating text:
  - `x3` = **OPTIMIZED!**
  - `x5` = **STONKS 📈**
  - `x10` = **100x ENGINEER!**
- **Speed Milestones**: Every 240 frames, the game flashes **SPEED UP!** as the BGM shifts to a higher gear.
- **Death Screen Memes**: When you die, the classic "GAME OVER" is replaced by randomized programmer pain:
  - `SYNTAX ERROR`, `GIT PUSH --FORCE`, `IT'S A FEATURE`, `SEGMENTATION FAULT`, `418 I'M A TEAPOT`, `STACK OVERFLOW`, `OOF.JS`, `rm -rf /`

## 🏆 Leaderboard

Local high scores are saved to your browser! 
*Note: To prove you aren't a bot, you must reach a minimum score of **5000** and beat the lowest entry on the board to save your initials.*

## ⚠️ Disclaimer

This project is created strictly for fun and educational purposes. **It has absolutely no affiliation with Anthropic**. We just wanted to build a fun 2D homage to demonstrate some love for the awesome Claude CLI! ❤️

## ☕ Support the Project

If you enjoy the game, consider buying us a coffee!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H51MPWG)

## 💻 Credits

Developed by **Eduardo Arana** and **Soda 🥤**
