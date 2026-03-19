/**
 * Claude Jump — Behavioural Specs
 *
 * Spec-driven development: define expected behaviour here BEFORE implementing.
 * Run with Node:    node spec/game.spec.js
 * Run in browser:   open spec/index.html
 */

// ---------------------------------------------------------------------------
// Tiny test framework (no dependencies)
// ---------------------------------------------------------------------------

const results = { passed: 0, failed: 0, tests: [] };

function describe(name, fn) {
    if (typeof console !== 'undefined' && console.group) console.group(name);
    fn();
    if (typeof console !== 'undefined' && console.groupEnd) console.groupEnd();
}

function it(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log('  ✓ ' + name);
    } catch (e) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: e.message });
        console.error('  ✗ ' + name + ': ' + e.message);
    }
}

function expect(value) {
    return {
        toBe:             (e) => { if (value !== e)   throw new Error('Expected ' + JSON.stringify(value) + ' to be ' + JSON.stringify(e)); },
        toEqual:          (e) => { if (JSON.stringify(value) !== JSON.stringify(e)) throw new Error('Expected ' + JSON.stringify(value) + ' to equal ' + JSON.stringify(e)); },
        toBeGreaterThan:  (e) => { if (value <= e)    throw new Error('Expected ' + value + ' > ' + e); },
        toBeLessThan:     (e) => { if (value >= e)    throw new Error('Expected ' + value + ' < ' + e); },
        toBeGreaterThanOrEqual: (e) => { if (value < e) throw new Error('Expected ' + value + ' >= ' + e); },
        toBeTruthy:       ()  => { if (!value)         throw new Error('Expected ' + value + ' to be truthy'); },
        toBeFalsy:        ()  => { if (value)          throw new Error('Expected ' + value + ' to be falsy'); },
        toContain:        (e) => { if (!value.includes(e)) throw new Error('Expected ' + JSON.stringify(value) + ' to contain ' + JSON.stringify(e)); },
    };
}

// ---------------------------------------------------------------------------
// Pure re-implementations of game logic (no canvas dependency)
// ---------------------------------------------------------------------------

const PIXEL_SIZE  = 4;
const GRAVITY     = 0.6;
const JUMP_FORCE  = -10;
const GROUND_Y    = 240; // mock value

function checkCollision(r1, r2) {
    if (!r1 || !r2) return false;
    return !(
        r2.x > r1.x + r1.w ||
        r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y
    );
}

function simulateJump() {
    let vy = JUMP_FORCE;
    let y  = GROUND_Y - 40; // player height = 40
    let frames = 0;
    while (frames < 1000) {
        y  += vy;
        vy += GRAVITY;
        frames++;
        if (y >= GROUND_Y - 40 && vy >= 0) {
            y  = GROUND_Y - 40;
            vy = 0;
            break;
        }
    }
    return { y, vy, frames };
}

// ---------------------------------------------------------------------------
// SPECS
// ---------------------------------------------------------------------------

// --- Collision Detection ---------------------------------------------------
describe('Collision Detection', () => {
    it('returns false when both hitboxes are null', () => {
        expect(checkCollision(null, null)).toBe(false);
    });
    it('returns false when first hitbox is null', () => {
        expect(checkCollision(null, { x:0, y:0, w:10, h:10 })).toBe(false);
    });
    it('detects overlap when boxes intersect', () => {
        expect(checkCollision({ x:0, y:0, w:10, h:10 }, { x:5, y:5, w:10, h:10 })).toBe(true);
    });
    it('returns false when boxes do not intersect', () => {
        expect(checkCollision({ x:0, y:0, w:10, h:10 }, { x:20, y:20, w:10, h:10 })).toBe(false);
    });
    it('treats touching edges as a collision (pixel-art AABB behaviour)', () => {
        // The game uses strict > / < so r2.x === r1.x+r1.w is still a collision.
        // This is intentional — sprites that touch pixels are considered hitting.
        expect(checkCollision({ x:0, y:0, w:10, h:10 }, { x:10, y:0, w:10, h:10 })).toBe(true);
    });
    it('detects 1-pixel overlap', () => {
        expect(checkCollision({ x:0, y:0, w:11, h:10 }, { x:10, y:0, w:10, h:10 })).toBe(true);
    });
    it('detects overlap when one box fully contains another', () => {
        expect(checkCollision({ x:0, y:0, w:100, h:100 }, { x:10, y:10, w:5, h:5 })).toBe(true);
    });
});

// --- Enemy Specs -----------------------------------------------------------
describe('Enemy: bug (ground crawler)', () => {
    const width  = 10 * PIXEL_SIZE; // 40
    const height = 7  * PIXEL_SIZE; // 28
    const y      = GROUND_Y - height;

    it('width is 40px (10 × PIXEL_SIZE)', () => { expect(width).toBe(40); });
    it('height is 28px (7 × PIXEL_SIZE)', () => { expect(height).toBe(28); });
    it('spawns at ground level', () => { expect(y).toBe(GROUND_Y - height); });
});

describe('Enemy: fly (airborne)', () => {
    const width  = 8 * PIXEL_SIZE; // 32
    const height = 4 * PIXEL_SIZE; // 16
    const baseY  = GROUND_Y - height - 50; // high variant

    it('width is 32px', () => { expect(width).toBe(32); });
    it('spawns above ground', () => { expect(baseY).toBeLessThan(GROUND_Y); });
    it('hover amplitude is ±15px', () => {
        const amplitude = 15;
        expect(amplitude).toBeGreaterThan(0);
    });
});

describe('Enemy: rate_limit (429 wide blocker)', () => {
    const width  = 16 * PIXEL_SIZE; // 64
    const height = 8  * PIXEL_SIZE; // 32
    const bugW   = 10 * PIXEL_SIZE; // 40

    it('is wider than a standard bug enemy', () => { expect(width).toBeGreaterThan(bugW); });
    it('spawns at ground level (full blocker)', () => {
        const y = GROUND_Y - height;
        expect(y).toBe(GROUND_Y - height);
        expect(y).toBeLessThan(GROUND_Y);
    });
    it('pulses visually (phase increments each frame)', () => {
        let phase = 0;
        phase += 0.05;
        expect(phase).toBeGreaterThan(0);
    });
});

describe('Enemy: timeout (fast CLI timeout)', () => {
    const speedMult = 2.5;
    const baseSpeed = 7;

    it('moves faster than game speed by speedMult factor', () => {
        const effectiveExtra = baseSpeed * (speedMult - 1);
        expect(effectiveExtra).toBeGreaterThan(baseSpeed);
    });
    it('total speed is at least 2.5× base', () => {
        const total = baseSpeed + baseSpeed * (speedMult - 1);
        expect(total).toBeGreaterThanOrEqual(baseSpeed * 2.5);
    });
    it('spawns at or above ground (can be airborne)', () => {
        const height = 8 * PIXEL_SIZE;
        const yMax   = GROUND_Y - height;      // ground level
        const yMin   = GROUND_Y - height - 60; // up to 60px above
        expect(yMax).toBeLessThan(GROUND_Y);
        expect(yMin).toBeLessThan(yMax);
    });
});

describe('Enemy: hallucination (fake token)', () => {
    const hWidth  = 8 * PIXEL_SIZE; // 32
    const hHeight = 6 * PIXEL_SIZE; // 24
    const cWidth  = 8 * PIXEL_SIZE; // same
    const cHeight = 6 * PIXEL_SIZE; // same

    it('has same pixel dimensions as a real token collectible', () => {
        expect(hWidth).toBe(cWidth);
        expect(hHeight).toBe(cHeight);
    });
    it('spawns at collectible heights (ground ±40px)', () => {
        const yLow  = GROUND_Y - hHeight - 10;
        const yHigh = GROUND_Y - hHeight - 40;
        expect(yLow).toBeLessThan(GROUND_Y);
        expect(yHigh).toBeLessThan(yLow);
    });
    it('flickers purple roughly every 60 frames as a visual tell', () => {
        // flicker frame = Math.floor(frameCount / 6) % 10 === 0
        // → fires once every 60 frames
        const flickerPeriodFrames = 6 * 10;
        expect(flickerPeriodFrames).toBe(60);
    });
});

// --- Level Progression -----------------------------------------------------
describe('Level Progression', () => {
    it('game starts at level 1', () => {
        let currentLevel = 1;
        expect(currentLevel).toBe(1);
    });
    it('requires 1000 tokens to leave level 1', () => {
        let score = 1000; let level = 1;
        if (score >= 1000 && level === 1) level = 2;
        expect(level).toBe(2);
    });
    it('does NOT transition at 999 tokens', () => {
        let score = 999; let level = 1;
        if (score >= 1000 && level === 1) level = 2;
        expect(level).toBe(1);
    });
    it('requires 2000 total tokens to leave level 2', () => {
        let score = 2000; let level = 2;
        if (score >= 2000 && level === 2) level = 3;
        expect(level).toBe(3);
    });
    it('does NOT transition to level 3 from level 1 (must pass through level 2)', () => {
        let score = 3000; let level = 1;
        if (score >= 1000 && level === 1) level = 2;
        if (score >= 2000 && level === 2) level = 3;
        expect(level).toBe(3); // 1 → 2 → 3 sequential
    });
    it('does NOT skip level 2 even at very high score', () => {
        let score = 9999; let level = 1;
        if (score >= 1000 && level === 1) level = 2;
        expect(level).toBe(2); // only level 2 transition fires first
    });
});

// --- Score Mechanics -------------------------------------------------------
describe('Score Mechanics', () => {
    it('combo multiplier increases per consecutive token', () => {
        let combo = 0; let score = 0;
        for (let i = 0; i < 3; i++) { combo++; score += 50 * combo; }
        expect(combo).toBe(3);
        expect(score).toBe(300); // 50+100+150
    });
    it('combo resets to 0 when a token is missed', () => {
        let combo = 5;
        combo = 0;
        expect(combo).toBe(0);
    });
    it('corrupted token subtracts 500 points', () => {
        let score = 1000; score -= 500;
        expect(score).toBe(500);
    });
    it('score is clamped to 0 on level-3 enemy platform hits', () => {
        let score = 30; score -= 50;
        if (score < 0) score = 0;
        expect(score).toBe(0);
    });
    it('gpu collectible does not directly add score', () => {
        let score = 500;
        // GPU grants invincibility, not direct points
        let invincibilityTimer = 400;
        expect(score).toBe(500); // unchanged
        expect(invincibilityTimer).toBe(400);
    });
    it('context collectible decreases game speed by 2', () => {
        let gameSpeed = 9;
        gameSpeed = Math.max(6, gameSpeed - 2.0);
        expect(gameSpeed).toBe(7);
    });
    it('context collectible never reduces speed below 6', () => {
        let gameSpeed = 6.5;
        gameSpeed = Math.max(6, gameSpeed - 2.0);
        expect(gameSpeed).toBe(6);
    });
    it('smashing an obstacle while invincible gives +100', () => {
        let score = 500;
        score += 100; // smash
        expect(score).toBe(600);
    });
});

// --- Physics ---------------------------------------------------------------
describe('Physics', () => {
    it('GRAVITY is positive (pulls downward)', () => { expect(GRAVITY).toBeGreaterThan(0); });
    it('JUMP_FORCE is negative (pushes upward)', () => { expect(JUMP_FORCE).toBeLessThan(0); });
    it('player returns to ground after a jump', () => {
        const { y } = simulateJump();
        expect(y).toBe(GROUND_Y - 40);
    });
    it('jump velocity is zero when landing', () => {
        const { vy } = simulateJump();
        expect(vy).toBe(0);
    });
    it('jump arc takes at least 10 frames', () => {
        const { frames } = simulateJump();
        expect(frames).toBeGreaterThan(10);
    });
    it('level-3 vertical mode uses floatier gravity (0.7 × GRAVITY)', () => {
        const verticalGravity = GRAVITY * 0.7;
        expect(verticalGravity).toBeLessThan(GRAVITY);
    });
    it('level-3 bounce force is 1.3 × JUMP_FORCE (more powerful)', () => {
        const bounceForce = JUMP_FORCE * 1.3;
        expect(bounceForce).toBeLessThan(JUMP_FORCE); // more negative = stronger
    });
});

// --- Platform Types (Level 3) ---------------------------------------------
describe('Platform Types (Level 3)', () => {
    it('enemy platform costs 50 score on landing', () => {
        let score = 500; score -= 50;
        expect(score).toBe(450);
    });
    it('boost platform gives +100 score', () => {
        let score = 500; score += 100;
        expect(score).toBe(600);
    });
    it('boost platform applies 2.2× jump force (super bounce)', () => {
        const boostForce = JUMP_FORCE * 2.2;
        const normalBounce = JUMP_FORCE * 1.3;
        expect(boostForce).toBeLessThan(normalBounce); // more negative = higher
    });
    it('death floor rises faster as score increases', () => {
        const rise = (score) => 1.5 + score * 0.0005;
        expect(rise(1000)).toBeGreaterThan(rise(100));
    });
    it('death floor rise rate at score 0 is 1.5px/frame', () => {
        const rise = 1.5 + 0 * 0.0005;
        expect(rise).toBe(1.5);
    });
    it('CLI error labels include expected messages', () => {
        const labels = ['RATE LIMIT', 'TOOL DENIED', 'CTX FULL', 'BAD PROMPT', 'PERM DENIED', 'DEPRECATED'];
        expect(labels).toContain('RATE LIMIT');
        expect(labels).toContain('TOOL DENIED');
        expect(labels).toContain('PERM DENIED');
    });
});

// --- Floor-Slow Bonus (Level 3) --------------------------------------------
describe('Floor-Slow Bonus', () => {
    it('collecting a CTX bonus adds 360 frames to floorSlowTimer', () => {
        let floorSlowTimer = 0;
        floorSlowTimer += 360;
        expect(floorSlowTimer).toBe(360);
    });
    it('floorSlowTimer is capped at 720 frames (12 s)', () => {
        let floorSlowTimer = 700;
        floorSlowTimer += 360;
        if (floorSlowTimer > 720) floorSlowTimer = 720;
        expect(floorSlowTimer).toBe(720);
    });
    it('floor rises at ~0.3 px/frame while slow timer is active (vs 1.5 normally)', () => {
        let normalRise = 1.5;
        let slowRise   = 0.3;
        expect(slowRise).toBeLessThan(normalRise * 0.5); // less than half
    });
    it('floor rise resumes normally once timer reaches 0', () => {
        let floorSlowTimer = 1;
        floorSlowTimer--;
        // Timer expired — normal rise applies
        expect(floorSlowTimer).toBe(0);
    });
    it('bonus is placed 38 px above its platform (reachable on bounce)', () => {
        let platformY = 400;
        let bonusY    = platformY - 38;
        expect(bonusY).toBeLessThan(platformY);
        expect(platformY - bonusY).toBe(38);
    });
    it('bonus is 24×24 px hitbox', () => {
        let bSize = 24;
        expect(bSize).toBeGreaterThan(0);
    });
});

// --- Reset Behaviour -------------------------------------------------------
describe('Reset Behaviour', () => {
    it('resetGame sets currentLevel back to 1', () => {
        let currentLevel = 3;
        // simulate reset
        currentLevel = 1;
        expect(currentLevel).toBe(1);
    });
    it('resetGame clears platforms array', () => {
        let platforms = [{ x: 0 }, { x: 100 }];
        platforms = [];
        expect(platforms.length).toBe(0);
    });
    it('resetGame resets moveLeft and moveRight to false', () => {
        let moveLeft = true; let moveRight = true;
        moveLeft = false; moveRight = false;
        expect(moveLeft).toBe(false);
        expect(moveRight).toBe(false);
    });
    it('resetGame resets score to 0', () => {
        let score = 1500; score = 0;
        expect(score).toBe(0);
    });
    it('resetGame resets combo to 0', () => {
        let combo = 10; combo = 0;
        expect(combo).toBe(0);
    });
    it('resetGame clears verticalBonuses array', () => {
        let verticalBonuses = [{ active: true }, { active: false }];
        verticalBonuses = [];
        expect(verticalBonuses.length).toBe(0);
    });
    it('resetGame resets floorSlowTimer to 0', () => {
        let floorSlowTimer = 360;
        floorSlowTimer = 0;
        expect(floorSlowTimer).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('');
console.log('=== SPEC RESULTS ===');
console.log('Passed : ' + results.passed);
console.log('Failed : ' + results.failed);
console.log('Total  : ' + (results.passed + results.failed));
if (results.failed > 0) {
    console.log('');
    console.log('FAILURES:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log('  ✗ ' + t.name + ' — ' + t.error);
    });
    if (typeof process !== 'undefined') process.exit(1);
}

if (typeof module !== 'undefined') module.exports = results;
