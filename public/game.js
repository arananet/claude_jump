const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboardList = document.getElementById('leaderboard-list');
const newHighscoreBox = document.getElementById('new-highscore-box');
const initialsInput = document.getElementById('initials-input');
const submitScoreBtn = document.getElementById('submit-score-btn');
const restartText = document.getElementById('restart-text');
const gameOverTitle = gameOverScreen.querySelector('h1');

// Audio
const bgm = new Audio('music/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.4;

const jumpSfx = new Audio('music/mixkit-player-jumping-in-a-video-game-2043.wav');
jumpSfx.volume = 0.6;

const collectSfx = new Audio('music/mixkit-winning-a-coin-video-game-2069.wav');
collectSfx.volume = 0.7;

const dieSfx = new Audio('music/mixkit-player-losing-or-failing-2042.wav');
dieSfx.volume = 0.8;

// Game state
let isPlaying = false;
let isGameOver = false;
let frameCount = 0;
let score = 0;
let highScores = JSON.parse(localStorage.getItem('claudeJumpScoresList')) || [];

if (highScores.length === 0 || highScores.some(s => s.score < 5000)) {
    highScores = [
        { initials: 'EDU', score: 9000 },
        { initials: 'SDA', score: 8000 },
        { initials: 'CLD', score: 7000 },
        { initials: 'BOT', score: 6000 },
        { initials: 'ANT', score: 5000 }
    ];
    localStorage.setItem('claudeJumpScoresList', JSON.stringify(highScores));
}

let topScore = highScores.length > 0 ? highScores[0].score : 0;
let isEnteringScore = false;
let gameSpeed = 7;

// Arcade Mechanics
let combo = 0;
let invincibilityTimer = 0;
let shakeTime = 0;

// Physics
let GROUND_Y = 240;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;

// Colors
let COLOR_BG = '#242424';
const COLOR_CLAUDE = '#D46B4E'; 
const COLOR_BUG = '#e54343'; 
let COLOR_GROUND = '#555555';
const COLOR_CLAUDE_EYE = '#000000';
const COLOR_APPLE = '#ff3366';
const COLOR_BERRY = '#33ccff';
const COLOR_GPU = '#FFD700'; // Gold Invincibility
const COLOR_FRUIT_LEAF = '#33cc66';

// Memes
const DEATH_MEMES = [
    "429 TOO MANY REQUESTS", "TOKEN LIMIT EXCEEDED", "CONTEXT WINDOW FULL",
    "HALLUCINATION DETECTED", "FILTERED BY SAFETY", "API KEY REVOKED",
    "PROMPT INJECTION FATAL", "GPU OUT OF MEMORY",
    "TOOL PERMISSION DENIED", "MAX TOKENS REACHED", "CLAUDE.AI TIMEOUT",
    "CONTEXT CORRUPTED", "BAD PROMPT DETECTED", "RATE LIMITED BY ANTHROPIC",
    "TOOL USE REJECTED", "MISSING CLAUDE.MD"
];

// Handle resizing
let lastWidth = 0;
let lastHeight = 0;

function resize() {
    let rect = canvas.parentElement.getBoundingClientRect();
    let newW = rect.width;
    let newH = rect.height;
    
    // Safety check - if container is mysteriously small, don't break the game logic
    if (newH < 50 || newW < 50) return; 
    
    if (newW === lastWidth && newH === lastHeight) return;
    
    // Ignore minor vertical resizes on mobile to prevent the address bar from deleting the floor
    if (newW === lastWidth && Math.abs(newH - lastHeight) < 150 && lastHeight !== 0) {
        return; 
    }
    
    lastWidth = newW;
    lastHeight = newH;
    
    canvas.width = newW;
    canvas.height = newH;
    GROUND_Y = canvas.height - Math.max(40, canvas.height * 0.15);
    
    // Always do a clean initialization on resize to prevent coordinate corruption
    initGround();
    
    if (player) {
        if (!player.isJumping && !player.isFalling) {
            // Keep grounded player on the new ground line
            player.y = GROUND_Y - player.height;
            player.vy = 0;
        } else {
            // Mid-air safety net so player doesn't clip through the new ground
            if (player.y > GROUND_Y - player.height) {
                player.y = GROUND_Y - player.height;
            }
        }
    }
}
window.addEventListener('resize', resize);

// --- Sprites ---
const PIXEL_SIZE = 4;

const claudeFrame1 = [
    "  11111111  ",
    "  13111131  ",
    "  11111111  ",
    "111111111111",
    "111111111111",
    "  11111111  ",
    "  11111111  ",
    "  11111111  ",
    "  1 1  1 1  ",
    "  1 1  1 1  "
];

const claudeFrame2 = [
    "  11111111  ",
    "  13111131  ",
    "  11111111  ",
    "111111111111",
    "111111111111",
    "  11111111  ",
    "  11111111  ",
    "  11111111  ",
    "   1 11 1   ",
    "   1 11 1   "
];

const bugMap = [
    " 4444444 ",
    " 4 4 4 4 ",
    " 4444444 ",
    " 4  4  4 ",
    " 4444444 "
];

const bugMap2 = [
    " 4444444 ",
    " 44 4 44 ",
    " 4444444 ",
    "44  4  44",
    " 4444444 "
];

const flyMap1 = [
    "  44444  ",
    " 44 4 44 ",
    "  44444  "
];

const flyMap2 = [
    " 4444444 ",
    " 4  4  4 ",
    " 4444444 "
];

const fruitMap = [
    "  6666  ",
    " 655556 ",
    " 656656 ",
    " 656656 ",
    " 655556 ",
    "  6666  "
];

const gpuMap = [
    " 666666 ",
    "66111166",
    "61666616",
    "61666616",
    "66111166",
    " 666666 "
];

function drawSprite(x, y, map, overrideColor = null, ps = PIXEL_SIZE) {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            let char = map[r][c];
            if (char === ' ') continue;

            if (char === '1') ctx.fillStyle = COLOR_CLAUDE;
            else if (char === '3') ctx.fillStyle = COLOR_CLAUDE_EYE;
            else if (char === '4') ctx.fillStyle = COLOR_BUG;
            else if (char === '5') ctx.fillStyle = COLOR_FRUIT_LEAF;
            else if (char === '6') ctx.fillStyle = overrideColor;

            ctx.fillRect(x + c * ps, y + r * ps, ps, ps);
        }
    }
}

// --- Effects ---
class FloatingText {
    constructor(x, y, text, color, isStatic = false, duration = 60, scale = 1) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.isStatic = isStatic;
        this.maxDuration = duration;
        this.duration = duration;
        this.scale = scale;
    }
    update() {
        this.duration--;
        if (!this.isStatic) this.y -= 1.5;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.duration / this.maxDuration);
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        
        if (this.isStatic) {
            // Cap to ~5% of canvas width so it never overflows on mobile
            let base = Math.min(24, canvas.width * 0.05);
            ctx.font = `${base * this.scale}px "Press Start 2P", Courier`;
            let scalePulse = 1 + Math.sin(frameCount * 0.2) * 0.05;
            ctx.translate(canvas.width / 2, this.y);
            ctx.scale(scalePulse, scalePulse);
            ctx.fillText(this.text, 0, 0);
        } else {
            let base = Math.min(14, canvas.width * 0.038);
            ctx.font = `${base * this.scale}px "Press Start 2P", Courier`;
            ctx.fillText(this.text, this.x + 20, this.y);
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; 
        this.y = y; 
        this.color = color;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12;
        this.life = 1.0;
    }
    update() { 
        this.x += this.vx; 
        this.y += this.vy; 
        this.vy += 0.2; // Gravity for particles
        this.life -= 0.03; 
    }
    draw() { 
        ctx.fillStyle = this.color; 
        ctx.globalAlpha = Math.max(0, this.life); 
        ctx.fillRect(this.x, this.y, PIXEL_SIZE, PIXEL_SIZE); 
        ctx.globalAlpha = 1; 
    }
}

// --- Entities ---
class Player {
    constructor() {
        this.width = 12 * PIXEL_SIZE;
        this.height = 10 * PIXEL_SIZE;
        this.x = Math.max(40, canvas.width * 0.1); 
        this.y = GROUND_Y - this.height;
        this.vy = 0;
        this.isJumping = false;
        this.isFalling = false;
    }

    jump() {
        if (!this.isJumping && !this.isFalling) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
            jumpSfx.currentTime = 0;
            jumpSfx.play().catch(e => {});
        }
    }

    update() {
        this.y += this.vy;
        this.vy += GRAVITY;

        let overHole = false;
        for (let obs of obstacles) {
            if (obs.type === 'hole') {
                let pLeft = this.x + PIXEL_SIZE * 3;
                let pRight = this.x + this.width - PIXEL_SIZE * 3;
                if (pLeft > obs.x && pRight < obs.x + obs.width) {
                    overHole = true;
                }
            }
        }

        if (this.y >= GROUND_Y - this.height && this.vy >= 0) {
            if (!overHole && !this.isFalling) {
                this.y = GROUND_Y - this.height;
                this.vy = 0;
                this.isJumping = false;
                this.isFalling = false;
            } else {
                this.isFalling = true; // Down we go
            }
        }

        if (this.y > canvas.height + 50) {
            die();
        }
    }

    draw() {
        let currentMap = claudeFrame1;
        if (!this.isJumping && !this.isFalling && isPlaying) {
            if (Math.floor(frameCount / 6) % 2 === 0) {
                currentMap = claudeFrame2;
            }
        }
        
        let drawColor = COLOR_CLAUDE;
        if (invincibilityTimer > 0) {
            // Flash rainbow/gold when invincible
            const colors = ['#FFD700', '#FFF', '#FF3366', '#33CCFF'];
            drawColor = colors[Math.floor(frameCount / 4) % colors.length];
        } else if (corruptionTimer > 0) {
            // Glow angry red when corrupted
            drawColor = '#FF0000';
        }
        
        drawSprite(this.x, this.y, currentMap, drawColor);
    }
    
    getHitbox() {
        return {
            x: this.x + PIXEL_SIZE * 2,
            y: this.y + PIXEL_SIZE * 2,
            w: this.width - PIXEL_SIZE * 4,
            h: this.height - PIXEL_SIZE * 3
        };
    }
}

class Obstacle {
    constructor(type) {
        this.type = type;
        this.x = canvas.width;
        this.markedForDeletion = false;

        if (this.type === 'bug') {
            // Drawn at PS6 (1.5× PIXEL_SIZE): sprite cols=9 → 54px, rows=5 → 30px
            this.width = 14 * PIXEL_SIZE;   // ~56px — matches drawn sprite width
            this.height = 8 * PIXEL_SIZE;   // ~32px — with leg-bounce room
            this.y = GROUND_Y - this.height;
        } else if (this.type === 'fly') {
            this.width = 8 * PIXEL_SIZE;
            this.height = 4 * PIXEL_SIZE;
            let isHigh = Math.random() > 0.5;
            this.baseY = isHigh ? GROUND_Y - this.height - 50 : GROUND_Y - this.height - 20;
            this.y = this.baseY;
            this.bounceOffset = Math.random() * Math.PI * 2;
        } else if (this.type === 'hole') {
            this.width = 20 * PIXEL_SIZE + Math.random() * 20 * PIXEL_SIZE;
            this.height = 0; 
            this.y = GROUND_Y;
        } else if (this.type === 'glitch') {
            this.width = 6 * PIXEL_SIZE;
            this.height = 6 * PIXEL_SIZE;
            // Spawns randomly anywhere from ground level to high up
            this.y = GROUND_Y - this.height - Math.random() * 80;
            this.speedOffset = gameSpeed * (0.5 + Math.random() * 0.5); // Move faster than standard speed
        } else if (this.type === 'rate_limit') {
            // Wide ground-level blocker — CLI 429 error
            this.width = 16 * PIXEL_SIZE;
            this.height = 8 * PIXEL_SIZE;
            this.y = GROUND_Y - this.height;
            this.phase = Math.random() * Math.PI * 2;
        } else if (this.type === 'timeout') {
            // Fast-moving airborne enemy — CLI timeout error, 2.5× speed
            this.width = 8 * PIXEL_SIZE;
            this.height = 8 * PIXEL_SIZE;
            this.baseY = GROUND_Y - this.height - Math.random() * 60;
            this.y = this.baseY;
            this.bounceOffset = Math.random() * Math.PI * 2;
            this.speedMult = 2.5;
        } else if (this.type === 'hallucination') {
            // Looks like a gold token but is lethal — fake collectible
            this.width = 8 * PIXEL_SIZE;
            this.height = 6 * PIXEL_SIZE;
            this.baseY = GROUND_Y - this.height - (Math.random() > 0.5 ? 40 : 10);
            this.y = this.baseY;
            this.hoverOffset = Math.random() * Math.PI * 2;
        }
    }

    update(activeSpeed) {
        this.x -= activeSpeed;
        if (this.type === 'fly') {
            this.y = this.baseY + Math.sin(frameCount * 0.1 + this.bounceOffset) * 15;
        } else if (this.type === 'glitch') {
            this.x -= this.speedOffset; // Moves much faster across the screen horizontally
            // Randomly jitter vertically to simulate "glitch"
            if (frameCount % 4 === 0) {
                this.y += (Math.random() - 0.5) * 15;
                // constrain y
                if (this.y > GROUND_Y - this.height) this.y = GROUND_Y - this.height;
                if (this.y < 20) this.y = 20;
            }
        } else if (this.type === 'rate_limit') {
            this.phase += 0.05;
        } else if (this.type === 'timeout') {
            // Extra speed on top of base movement — very fast
            this.x -= activeSpeed * (this.speedMult - 1);
            this.y = this.baseY + Math.sin(frameCount * 0.15 + this.bounceOffset) * 10;
        } else if (this.type === 'hallucination') {
            this.y = this.baseY + Math.sin(frameCount * 0.1 + this.hoverOffset) * 4;
        }
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
            // Dropped combo if an obstacle is passed safely? 
            // Nah, let's keep combo strictly to consecutive fruits.
        }
    }

    draw() {
        if (this.type === 'bug') {
            let frame   = Math.floor(frameCount / 7) % 2;
            let offsetY = frame === 0 ? -3 : 0;
            const BPS = 6; // bug pixel size — 1.5× for visibility on mobile
            drawSprite(this.x, this.y + offsetY, frame === 0 ? bugMap : bugMap2, null, BPS);
            // Glowing red eyes (scaled to BPS)
            ctx.save();
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillRect(this.x + BPS * 2, this.y + offsetY + BPS, BPS, BPS);
            ctx.fillRect(this.x + BPS * 6, this.y + offsetY + BPS, BPS, BPS);
            ctx.restore();

        } else if (this.type === 'fly') {
            let fMap = (frameCount % 12 < 6) ? flyMap1 : flyMap2;
            drawSprite(this.x, this.y, fMap);
            // Faint red wing-glow
            ctx.save();
            ctx.fillStyle = 'rgba(229,67,67,0.25)';
            ctx.fillRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6);
            ctx.restore();

        } else if (this.type === 'glitch') {
            ctx.save();
            // Solid neon body so it has a visible form
            ctx.fillStyle = '#cc00ff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Darker face / body detail
            ctx.fillStyle = '#220033';
            ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
            // Glitchy eyes — flash between colours
            let eyeCol = frameCount % 4 < 2 ? '#ffffff' : '#ff00ff';
            ctx.fillStyle = eyeCol;
            ctx.fillRect(this.x + 4, this.y + 6, 5, 4);
            ctx.fillRect(this.x + this.width - 9, this.y + 6, 5, 4);
            // RGB channel-split ghost layers
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#ff0044';
            ctx.fillRect(this.x - 4, this.y, this.width, this.height);
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(this.x + 4, this.y, this.width, this.height);
            ctx.globalAlpha = 1;
            // Random horizontal glitch bar
            ctx.fillStyle = frameCount % 2 === 0 ? '#ffffff' : '#ff00ff';
            let gbar = this.y + Math.floor(Math.random() * this.height);
            ctx.fillRect(this.x - 2, gbar, this.width + 4, 2);
            ctx.restore();

        } else if (this.type === 'rate_limit') {
            ctx.save();
            let pulse = 0.55 + Math.sin(this.phase) * 0.45;
            ctx.fillStyle = `rgba(180, 15, 15, ${pulse})`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Electric edges — top and bottom zigzag
            ctx.strokeStyle = `rgba(255,100,100,${0.7 + Math.sin(this.phase * 2) * 0.3})`;
            ctx.lineWidth = 2;
            for (let edge = 0; edge < 2; edge++) {
                let ey = edge === 0 ? this.y : this.y + this.height;
                ctx.beginPath();
                ctx.moveTo(this.x, ey);
                let steps = 8;
                for (let s = 1; s <= steps; s++) {
                    let ex = this.x + (this.width * s / steps);
                    let jitter = (s % 2 === 0 ? -5 : 5) * Math.sin(frameCount * 0.25 + s);
                    ctx.lineTo(ex, ey + jitter);
                }
                ctx.stroke();
            }
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${PIXEL_SIZE * 3}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('429', this.x + this.width / 2, this.y + this.height * 0.62);
            ctx.fillStyle = '#ffaaaa';
            ctx.font = `${PIXEL_SIZE * 1.5}px monospace`;
            ctx.fillText('RATE LIMIT', this.x + this.width / 2, this.y + this.height - 5);
            ctx.restore();

        } else if (this.type === 'timeout') {
            ctx.save();
            // Fading speed trails (to the right — where it came from)
            for (let t = 1; t <= 5; t++) {
                ctx.fillStyle = `rgba(255,${136 + t * 10},0,${0.12 + t * 0.04})`;
                let tw = this.width * (0.7 - t * 0.1);
                if (tw > 0) ctx.fillRect(this.x + this.width + t * 7, this.y + t * 2, tw, this.height - t * 4);
            }
            // Comet / arrowhead body
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width,        this.y + this.height / 2); // tip
            ctx.lineTo(this.x + this.width * 0.3,  this.y);
            ctx.lineTo(this.x,                     this.y + 5);
            ctx.lineTo(this.x,                     this.y + this.height - 5);
            ctx.lineTo(this.x + this.width * 0.3,  this.y + this.height);
            ctx.closePath();
            ctx.fill();
            // Yellow hot leading edge
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width,       this.y + this.height / 2);
            ctx.lineTo(this.x + this.width * 0.6, this.y + 4);
            ctx.lineTo(this.x + this.width * 0.6, this.y + this.height - 4);
            ctx.closePath();
            ctx.fill();
            // Label above
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${PIXEL_SIZE * 1.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('TIMEOUT', this.x + this.width / 2, this.y - 4);
            ctx.restore();

        } else if (this.type === 'hallucination') {
            let yOffset    = Math.sin(frameCount * 0.1 + this.hoverOffset) * 4;
            let isFlicker  = (Math.floor(frameCount / 6) % 10 === 0);
            // Pulsing purple aura — the subtle tell even without the flicker
            ctx.save();
            let aura = 0.07 + Math.sin(frameCount * 0.09 + this.hoverOffset) * 0.05;
            ctx.fillStyle = `rgba(180,50,255,${aura})`;
            ctx.fillRect(this.x - 5, this.y + yOffset - 5, this.width + 10, this.height + 10);
            ctx.restore();
            drawSprite(this.x, this.y + yOffset, fruitMap, isFlicker ? '#cc44ff' : '#FFD700');
            if (isFlicker) {
                ctx.save();
                ctx.fillStyle = '#ff00ff';
                ctx.font = `bold ${PIXEL_SIZE * 2}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText('?', this.x + this.width / 2, this.y + yOffset - 2);
                ctx.restore();
            }
        }
    }

    getHitbox() {
        if (this.type === 'hole') return { x:-1000, y:-1000, w:0, h:0 }; 
        return {
            x: this.x + PIXEL_SIZE,
            y: this.y + PIXEL_SIZE,
            w: this.width - PIXEL_SIZE * 2,
            h: this.height - PIXEL_SIZE * 2
        };
    }
}

class Collectible {
    constructor(type) {
        this.type = type; // 'token', 'context', 'gpu', 'corrupted'
        this.width = 8 * PIXEL_SIZE;
        this.height = 6 * PIXEL_SIZE;
        this.x = canvas.width;
        this.y = Math.random() > 0.5 ? GROUND_Y - this.height - 40 : GROUND_Y - this.height - 10;
        this.markedForDeletion = false;
        this.hoverOffset = Math.random() * Math.PI * 2;
    }

    update(activeSpeed) {
        this.x -= activeSpeed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
            if (this.type !== 'corrupted' && this.type !== 'gpu' && this.type !== 'context') {
                combo = 0; // Reset combo if you miss a normal token
                score -= 100; // Heavy penalty for missing a token!
                floatTexts.push(new FloatingText(this.x, this.y, "-100 TOKENS! COLLECT THEM!", "#ff3333", false, 80));
            }
        }
    }

    draw() {
        let yOffset = Math.sin(frameCount * 0.1 + this.hoverOffset) * 4;
        if (this.type === 'gpu') {
            drawSprite(this.x, this.y + yOffset, gpuMap, COLOR_GPU);
        } else if (this.type === 'corrupted') {
            drawSprite(this.x, this.y + yOffset, fruitMap, '#ff0000'); // Red bad token
        } else {
            let color = this.type === 'token' ? '#FFD700' : '#33ccff';
            drawSprite(this.x, this.y + yOffset, fruitMap, color);
        }
    }

    getHitbox() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }
}

// --- Game Variables ---
let player;
let obstacles = [];
let collectibles = [];
let floatTexts = [];
let particles = [];
let nextObstacleTimer = 0;
let nextFruitTimer = 0;
let groundDots = [];
let stars = [];
let clouds = [];
let farSkyline = [];
let nearSkyline = [];
let isRestarting = false;
let gameOverTime = 0;
let autoReturnTimer = null;
let gameOverMeme = '';
let gameOverCountdown = 0; // frames remaining for on-canvas countdown
let currentLevel = 1;

let platforms = [];
let cameraY = 0;
let deathFloorY = 0;
let moveLeft = false;
let moveRight = false;
let graceFrames = 0;    // Grace period at level start — death floor frozen
let floorSlowTimer = 0; // While > 0, death floor rises much slower
let verticalBonuses = []; // CTX EXPAND pickups floating above platforms

// Attract / demo mode
let idleTimer   = 0;   // frames spent on start screen
let attractMode = false;
let attractFrame = 0;

const CLI_ERROR_LABELS = ['RATE LIMIT', 'TOOL DENIED', 'CTX FULL', 'BAD PROMPT', 'PERM DENIED', 'DEPRECATED'];

class Platform {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 60 + Math.random() * 40;
        this.height = 12;
        this.type = type; // 'normal', 'moving', 'enemy', 'boost'
        this.vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
        this.label = type === 'enemy'
            ? CLI_ERROR_LABELS[Math.floor(Math.random() * CLI_ERROR_LABELS.length)]
            : null;
    }
    update() {
        if (this.type === 'moving' || this.type === 'enemy') {
            this.x += this.vx;
            if (this.x < 0 || this.x + this.width > canvas.width) {
                this.vx *= -1;
            }
        }
    }
    draw() {
        let sy = this.y - cameraY;
        if (this.type === 'enemy') {
            ctx.fillStyle = '#550000';
            ctx.fillRect(this.x, sy, this.width, this.height);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, sy, this.width, 3);
            ctx.save();
            ctx.fillStyle = '#ff6666';
            ctx.font = `${PIXEL_SIZE * 1.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(this.label || 'ERROR', this.x + this.width / 2, sy - 5);
            ctx.restore();
        } else if (this.type === 'boost') {
            ctx.fillStyle = '#003300';
            ctx.fillRect(this.x, sy, this.width, this.height);
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(this.x, sy, this.width, 3);
            ctx.save();
            ctx.fillStyle = '#00ff66';
            ctx.font = `${PIXEL_SIZE * 1.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('GPU BOOST', this.x + this.width / 2, sy - 5);
            ctx.restore();
        } else if (this.type === 'moving') {
            ctx.fillStyle = '#2d0045';
            ctx.fillRect(this.x, sy, this.width, this.height);
            ctx.fillStyle = '#9900cc';
            ctx.fillRect(this.x, sy, this.width, 3);
        } else {
            // normal
            ctx.fillStyle = '#001a33';
            ctx.fillRect(this.x, sy, this.width, this.height);
            ctx.fillStyle = '#0055cc';
            ctx.fillRect(this.x, sy, this.width, 3);
        }
    }
}

function initVertical() {
    platforms = [];
    verticalBonuses = [];
    cameraY = 0;
    deathFloorY = canvas.height;

    // Full-width base platform — player starts here
    platforms.push(new Platform(0, canvas.height - 20, 'normal'));
    platforms[0].width = canvas.width;

    // First 10 platforms: all normal so the player can learn the bounce mechanic
    let currY = canvas.height - 100;
    for (let i = 0; i < 10; i++) {
        let p = new Platform(Math.random() * (canvas.width - 100), currY, 'normal');
        platforms.push(p);
        // Every 3rd safe platform gets a floor-slow bonus above it
        if (i % 3 === 1) addFloorSlowBonus(p);
        currY -= (60 + Math.random() * 40);
    }

    // Remaining platforms: full mix (enemy / boost / moving / normal)
    for (let i = 0; i < 10; i++) {
        spawnPlatform(currY);
        currY -= (60 + Math.random() * 40);
    }
}

function addFloorSlowBonus(platform) {
    verticalBonuses.push({
        x: platform.x + platform.width / 2 - 12,
        y: platform.y - 38,       // floats just above the platform
        active: true,
        hoverOffset: Math.random() * Math.PI * 2
    });
}

function spawnPlatform(yPos) {
    let r = Math.random();
    let type = 'normal';
    if (r > 0.88) type = 'enemy';       // 12% — CLI error platform
    else if (r > 0.76) type = 'boost';  // 12% — GPU boost platform
    else if (r > 0.50) type = 'moving'; // 26% — moving platform
    // else 50% normal

    let p = new Platform(Math.random() * (canvas.width - 100), yPos, type);
    platforms.push(p);

    // 22% chance of a floor-slow bonus on safe platforms
    if ((type === 'normal' || type === 'boost') && Math.random() < 0.22) {
        addFloorSlowBonus(p);
    }
}

let corruptionTimer = 0; // Speed debuff timer

function spawnExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function triggerShake(duration) {
    shakeTime = duration;
}

function initGround() {
    groundDots = [];
    for(let i=0; i<50; i++) {
        groundDots.push({
            x: Math.random() * canvas.width,
            y: GROUND_Y + Math.random() * (canvas.height - GROUND_Y)
        });
    }

    stars = [];
    for(let i=0; i<40; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * GROUND_Y,
            size: Math.random() > 0.8 ? 4 : 2
        });
    }

    clouds = [];
    for(let i=0; i<5; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 2,
            y: 20 + Math.random() * (GROUND_Y / 2.5),
            w: 40 + Math.random() * 50,
            h: 12 + Math.random() * 12,
            speed: 0.05 + Math.random() * 0.05
        });
    }

    farSkyline = [];
    let cx = 0;
    while(cx < canvas.width * 2) {
        let w = 40 + Math.random() * 80;
        let h = 80 + Math.random() * 120;
        farSkyline.push({x: cx, w: w, h: h});
        cx += w + Math.random() * 10;
    }

    nearSkyline = [];
    cx = 0;
    while(cx < canvas.width * 2) {
        let w = 30 + Math.random() * 60;
        let h = 30 + Math.random() * 60;
        nearSkyline.push({x: cx, w: w, h: h});
        cx += w + Math.random() * 20;
    }
}

function drawParallax(activeSpeed) {
    let speed = activeSpeed || gameSpeed;
    ctx.fillStyle = '#3a3a3a';
    for(let s of stars) {
        if(isPlaying) s.x -= speed * 0.1;
        if(s.x + s.size < 0) {
            s.x = canvas.width;
            s.y = Math.random() * GROUND_Y;
        }
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    ctx.fillStyle = '#444444';
    for(let c of clouds) {
        if(isPlaying) c.x -= speed * c.speed;
        
        if(c.x + c.w < -10) {
            c.x = canvas.width + Math.random() * 100;
            c.y = 20 + Math.random() * (GROUND_Y / 2.5);
            c.w = 40 + Math.random() * 50;
            c.h = 12 + Math.random() * 12;
            c.speed = 0.05 + Math.random() * 0.05;
        }
        
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillRect(c.x + 10, c.y - 8, c.w - 20, 8);
        ctx.fillRect(c.x + 15, c.y + c.h, c.w - 30, 6);
    }

    ctx.fillStyle = '#2a2a2a';
    for(let i = 0; i < farSkyline.length; i++) {
        let b = farSkyline[i];
        if(isPlaying) b.x -= speed * 0.25;
        
        if(b.x + b.w < 0) {
            let lastX = Math.max(...farSkyline.map(f => f.x + f.w));
            b.x = Math.max(canvas.width, lastX) + Math.random() * 10;
            b.h = 80 + Math.random() * 120;
        }
        ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
    }

    ctx.fillStyle = '#333333';
    for(let i = 0; i < nearSkyline.length; i++) {
        let b = nearSkyline[i];
        if(isPlaying) b.x -= speed * 0.5;
        
        if(b.x + b.w < 0) {
            let lastX = Math.max(...nearSkyline.map(f => f.x + f.w));
            b.x = Math.max(canvas.width, lastX) + Math.random() * 20;
            b.h = 30 + Math.random() * 60;
        }
        ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
    }
}

function updateGround(activeSpeed) {
    let speed = activeSpeed || gameSpeed;
    // Draw solid ground mass below the surface line
    ctx.fillStyle = currentLevel === 2 ? '#120024' : '#1c1c1c';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);
    
    for(let i=0; i<groundDots.length; i++) {
        let dot = groundDots[i];
        dot.x -= speed * 0.8;
        if (dot.x < 0) {
            dot.x = canvas.width;
            dot.y = GROUND_Y + Math.random() * (canvas.height - GROUND_Y);
        }
        ctx.fillStyle = COLOR_GROUND;
        ctx.fillRect(dot.x, dot.y, 2, 2);
    }

    for(let obs of obstacles) {
        if (obs.type === 'hole') {
            let hx = obs.x, hy = GROUND_Y, hw = obs.width, hh = canvas.height - GROUND_Y;
            let isL2 = currentLevel === 2;

            // Abyss fill — semi-transparent so ground colour bleeds through
            ctx.fillStyle = isL2 ? 'rgba(5,0,16,0.82)' : 'rgba(10,8,8,0.80)';
            ctx.fillRect(hx, hy, hw, hh);

            // Faint depth gradient overlay (darker toward bottom)
            let grad = ctx.createLinearGradient(hx, hy, hx, hy + hh);
            grad.addColorStop(0,   isL2 ? 'rgba(60,0,80,0.18)' : 'rgba(40,28,20,0.18)');
            grad.addColorStop(1,   'rgba(0,0,0,0.55)');
            ctx.fillStyle = grad;
            ctx.fillRect(hx, hy, hw, hh);

            // Rock / rubble colour palette
            let rockBase  = isL2 ? '#1e0030' : '#2a211a';
            let rockLight = isL2 ? '#3a0050' : '#4a3828';
            let rockDark  = isL2 ? '#0d0018' : '#140d08';

            // Left crumbling wall
            ctx.fillStyle = rockLight;
            ctx.fillRect(hx, hy, 5, hh);
            ctx.fillStyle = rockBase;
            ctx.fillRect(hx + 5, hy, 3, hh);

            // Right crumbling wall
            ctx.fillStyle = rockLight;
            ctx.fillRect(hx + hw - 5, hy, 5, hh);
            ctx.fillStyle = rockBase;
            ctx.fillRect(hx + hw - 8, hy, 3, hh);

            // Stalactites hanging from the rim — pixel-art spikes
            ctx.save();
            let seed = Math.floor(hx / 4); // stable per hole (doesn't flicker)
            let spikeW = 6, gap = 10;
            for (let sx = hx + 4; sx < hx + hw - 4; sx += spikeW + gap) {
                // pseudo-random height using cheap hash
                let ph = (((seed ^ (sx * 7)) * 2654435761) >>> 0) % 14 + 8;
                // alternate light/dark
                let col = (Math.floor(sx / 4) % 2 === 0) ? rockLight : rockBase;
                ctx.fillStyle = col;
                ctx.fillRect(sx, hy, spikeW, ph);
                // dark tip
                ctx.fillStyle = rockDark;
                ctx.fillRect(sx + 1, hy + ph - 3, spikeW - 2, 3);
            }

            // Scattered rubble pebbles on the upper ledge
            ctx.fillStyle = rockLight;
            let pebbleSeed = seed + 99;
            for (let p = 0; p < 5; p++) {
                let px2 = hx + (((pebbleSeed * (p + 1) * 1664525) >>> 0) % Math.max(1, hw - 12)) + 6;
                let py2 = hy + 2 + (((pebbleSeed * (p + 3) * 22695477) >>> 0) % 4);
                ctx.fillRect(px2, py2, 3, 2);
            }
            ctx.restore();
        }
    }
}

function renderLeaderboard() {
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 5);
    topScore = highScores.length > 0 ? highScores[0].score : 0;
    
    let html = '';
    highScores.forEach((entry, idx) => {
        let sc = Math.floor(entry.score).toString().padStart(5, '0');
        let init = entry.initials.padEnd(3, ' ');
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>${idx+1}. ${init}</span><span>${sc}</span></div>`;
    });
    if(leaderboardList) leaderboardList.innerHTML = html;
}

function updateScore() {
    let comboStr = combo > 1 ? ` &nbsp; <span style="color:#FFD700">x${combo}</span>` : '';
    let sign = score < 0 ? "-" : "";
    let absScore = Math.abs(Math.floor(score)).toString().padStart(5, '0');
    scoreDisplay.innerHTML = `TOKENS: ${sign}${absScore}${comboStr} &nbsp;&nbsp; HI: ${Math.floor(topScore).toString().padStart(5, '0')}`;
}

function checkCollision(r1, r2) {
    if (!r1 || !r2) return false;
    return !(
        r2.x > r1.x + r1.w || 
        r2.x + r2.w < r1.x || 
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y
    );
}

// --- Core Logic ---
function resetGame() {
    player = new Player();
    obstacles = [];
    collectibles = [];
    floatTexts = [];
    particles = [];
    score = 0;
    combo = 0;
    invincibilityTimer = 0;
    corruptionTimer = 0;
    shakeTime = 0;
    gameSpeed = Math.min(canvas.width / 80, 8.5); 
    frameCount = 0;
    nextObstacleTimer = 60;
    nextFruitTimer = 120;
    
    // Restore all 3 levels — 1000 tokens needed to pass each level
    currentLevel = 1;
    platforms = [];
    verticalBonuses = [];
    floorSlowTimer = 0;
    moveLeft = false;
    moveRight = false;
    COLOR_BG = '#242424';
    COLOR_GROUND = '#555555';

    isPlaying = true;
    isGameOver = false;
    gameOverCountdown = 0;
    gameOverMeme = '';
    if (autoReturnTimer) { clearInterval(autoReturnTimer); autoReturnTimer = null; }

    bgm.playbackRate = 1.0;
    bgm.currentTime = 0;
    bgm.play().catch(e => {});
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    updateScore();
}

function die() {
    if (isGameOver) return;
    isPlaying = false;
    isGameOver = true;
    gameOverTime = Date.now();

    bgm.pause();
    dieSfx.currentTime = 0;
    dieSfx.play().catch(e => {});
    triggerShake(15);

    gameOverMeme = DEATH_MEMES[Math.floor(Math.random() * DEATH_MEMES.length)];

    let lowestHighScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;

    if (score >= 5000 && score > lowestHighScore) {
        // High score path — show HTML score entry screen
        isEnteringScore = true;
        gameOverTitle.innerText = gameOverMeme;
        newHighscoreBox.classList.remove('hidden');
        restartText.classList.add('hidden');
        initialsInput.value = '';
        setTimeout(() => initialsInput.focus(), 100);
        updateScore();
        gameOverScreen.classList.remove('hidden');
    } else {
        // Low score path — canvas-only overlay; auto-return after 10 s
        isEnteringScore = false;
        gameOverScreen.classList.add('hidden');
        gameOverCountdown = 600; // 10 s at 60 fps
    }
}

if(submitScoreBtn) {
    submitScoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveNewScore();
    });
    submitScoreBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        saveNewScore();
    }, {passive: false});
}
if(initialsInput) {
    initialsInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') saveNewScore();
    });
    initialsInput.addEventListener('mousedown', e => e.stopPropagation());
    initialsInput.addEventListener('touchstart', e => e.stopPropagation(), {passive: false});
}

function saveNewScore() {
    let init = initialsInput.value.trim().toUpperCase().substring(0, 3) || '???';
    highScores.push({ initials: init, score: Math.floor(score) });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 5);
    localStorage.setItem('claudeJumpScoresList', JSON.stringify(highScores));
    
    renderLeaderboard();
    
    isEnteringScore = false;
    newHighscoreBox.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    isPlaying = false;
    isGameOver = false;
}

function handleInput() {
    if (isEnteringScore) return;
    if (attractMode) { stopAttract(); return; }

    if (!isPlaying && !isGameOver) {
        resetGame();
    } else if (isPlaying) {
        player.jump();
    } else if (isGameOver) {
        if (Date.now() - gameOverTime > 500) {
            resetGame();
        }
    }
}


window.addEventListener('keydown', (e) => {
    if (attractMode) { stopAttract(); return; }
    if (currentLevel === 3) {
        if (e.code === 'ArrowLeft') moveLeft = true;
        if (e.code === 'ArrowRight') moveRight = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (currentLevel === 3) {
        if (e.code === 'ArrowLeft') moveLeft = false;
        if (e.code === 'ArrowRight') moveRight = false;
    }
});

canvas.parentElement.addEventListener('touchstart', (e) => {
    if (currentLevel === 3 && isPlaying) {
        let touchX = e.touches[0].clientX;
        let rect = canvas.getBoundingClientRect();
        if (touchX < rect.left + rect.width / 2) moveLeft = true;
        else moveRight = true;
    }
}, {passive: false});

canvas.parentElement.addEventListener('touchend', (e) => {
    if (currentLevel === 3) {
        moveLeft = false;
        moveRight = false;
    }
}, {passive: false});

canvas.parentElement.addEventListener('mousedown', (e) => {
    if (currentLevel === 3 && isPlaying) {
        let rect = canvas.getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) moveLeft = true;
        else moveRight = true;
    }
});
window.addEventListener('mouseup', () => {
    if (currentLevel === 3) {
        moveLeft = false;
        moveRight = false;
    }
});

// Inputs
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
    }
});
canvas.parentElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, {passive: false});
canvas.parentElement.addEventListener('mousedown', (e) => {
    if (e.button === 0) handleInput();
});

// ---------------------------------------------------------------------------
// Attract / demo mode
// ---------------------------------------------------------------------------

function drawGameOverOverlay() {
    if (!isGameOver || isEnteringScore) return;

    let cw = canvas.width, ch = canvas.height;
    let cx = cw / 2, cy = ch / 2;
    // Responsive unit: matches main-menu h1 scale
    let u = Math.max(12, Math.min(cw / 26, 30));

    // Dark vignette — same shade as .screen background
    ctx.fillStyle = 'rgba(36,36,36,0.88)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "GAME OVER" — #D46B4E + pixel shadow, same as <h1> in the main menu
    ctx.font = `${u * 1.9}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#D46B4E';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 0;
    // pixel-style hard shadow (2 px offset, like CSS text-shadow: 2px 2px 0 #000)
    ctx.fillStyle = '#000000';
    ctx.fillText('GAME OVER', cx + 3, cy - u * 2.6 + 3);
    ctx.fillStyle = '#D46B4E';
    ctx.fillText('GAME OVER', cx, cy - u * 2.6);

    // Death meme — word-wrapped, same #aaa as <p> in the main menu
    ctx.font = `${u * 0.75}px "Press Start 2P", monospace`;
    let maxW = Math.min(cw * 0.82, 560);
    let words = gameOverMeme.split(' ');
    let lines = [], cur = '';
    for (let w of words) {
        let test = cur + (cur ? ' ' : '') + w;
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
    }
    if (cur) lines.push(cur);
    let lineH = u * 1.2;
    let memeY = cy - u * 0.6 - (lines.length - 1) * lineH * 0.5;
    // shadow pass
    ctx.fillStyle = '#000000';
    lines.forEach((l, i) => ctx.fillText(l, cx + 2, memeY + i * lineH + 2));
    ctx.fillStyle = '#aaaaaa';
    lines.forEach((l, i) => ctx.fillText(l, cx, memeY + i * lineH));

    // Blinking "TAP / SPACE TO RETRY" — #D46B4E like h1
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.font = `${u * 0.72}px "Press Start 2P", monospace`;
        ctx.fillStyle = '#000000';
        ctx.fillText('TAP / SPACE TO RETRY', cx + 2, cy + u * 2 + 2);
        ctx.fillStyle = '#D46B4E';
        ctx.fillText('TAP / SPACE TO RETRY', cx, cy + u * 2);
    }

    // Small unobtrusive countdown
    let secsLeft = Math.max(0, Math.ceil(gameOverCountdown / 60));
    ctx.font = `${u * 0.5}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#555555';
    ctx.fillText(`returning in ${secsLeft}s`, cx, cy + u * 3.3);

    ctx.restore();
}

function startAttract() {
    attractMode  = true;
    attractFrame = 0;
    idleTimer    = 0;
    startScreen.classList.add('hidden');
}

function stopAttract() {
    attractMode  = false;
    attractFrame = 0;
    idleTimer    = 0;
    startScreen.classList.remove('hidden');
}

function drawAttract() {
    let phase = Math.min(2, Math.floor(attractFrame / 240)); // 0 → L1, 1 → L2, 2 → L3
    let pf    = attractFrame % 240;                          // 0-239 within each phase

    // Background
    const bgColors = ['#242424', '#1a0033', '#110011'];
    ctx.fillStyle = bgColors[phase];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (phase < 2) {
        // ---- Horizontal runner scene (L1 or L2) ----
        ctx.fillStyle = phase === 0 ? '#1c1c1c' : '#120024';
        ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
        ctx.fillStyle = phase === 0 ? '#555555' : '#4d004d';
        ctx.fillRect(0, GROUND_Y, canvas.width, 3);
        // Stars
        ctx.fillStyle = phase === 0 ? '#3a3a3a' : '#330033';
        for (let s of stars) ctx.fillRect(s.x, s.y, s.size, s.size);

        // Animated Claude — two jumps over 240 frames
        let px       = canvas.width * 0.22;
        let jumpY    = Math.max(0, Math.sin((pf / 240) * Math.PI * 4) * 65);
        let py       = GROUND_Y - 40 - jumpY;
        let pMap     = (Math.floor(pf / 6) % 2 === 0) ? claudeFrame1 : claudeFrame2;
        drawSprite(px, py, pMap, COLOR_CLAUDE);

        if (phase === 0) {
            // Bug crawling toward player
            let bx     = canvas.width * 1.1 - (pf / 240) * (canvas.width * 1.3);
            let bobOff = (Math.floor(pf / 8) % 2 === 0) ? -2 : 0;
            drawSprite(bx, GROUND_Y - 28 + bobOff, Math.floor(pf / 7) % 2 === 0 ? bugMap : bugMap2);
            ctx.save();
            ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 5;
            ctx.fillRect(bx + PIXEL_SIZE * 2, GROUND_Y - 28 + bobOff + PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            ctx.fillRect(bx + PIXEL_SIZE * 6, GROUND_Y - 28 + bobOff + PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            ctx.restore();
            // Fly bouncing mid-air
            let fx   = canvas.width * 0.78 - (pf / 240) * (canvas.width * 0.5);
            let fy   = GROUND_Y - 65 + Math.sin(pf * 0.05) * 15;
            let fMap = (Math.floor(pf / 6) % 2 === 0) ? flyMap1 : flyMap2;
            drawSprite(fx, fy, fMap);
        } else {
            // RGB-split glitch block
            let gx = canvas.width * 0.85 - (pf / 240) * (canvas.width * 0.8);
            let gy = GROUND_Y - 28;
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = '#ff0044'; ctx.fillRect(gx - 3, gy, 24, 24);
            ctx.fillStyle = '#00ff88'; ctx.fillRect(gx,     gy, 24, 24);
            ctx.fillStyle = '#4488ff'; ctx.fillRect(gx + 3, gy, 24, 24);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            for (let jj = gy; jj < gy + 24; jj += 4) ctx.fillRect(gx - 4, jj, 32, 2);
            ctx.restore();
            // 429 rate-limit wall
            let rlx   = canvas.width * 0.62 - (pf / 240) * (canvas.width * 0.55);
            let pulse = 0.5 + Math.sin(pf * 0.04) * 0.5;
            ctx.save();
            ctx.fillStyle = `rgba(200,20,20,${pulse})`;
            ctx.fillRect(rlx, GROUND_Y - 32, 64, 32);
            ctx.fillStyle = '#ff4444'; ctx.fillRect(rlx, GROUND_Y - 32, 64, 3);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
            ctx.fillText('429', rlx + 32, GROUND_Y - 12);
            ctx.restore();
        }

    } else {
        // ---- Vertical platformer scene (L3) ----
        ctx.fillStyle = '#330033';
        for (let s of stars) ctx.fillRect(s.x, (s.y + attractFrame * 0.5) % canvas.height, s.size, s.size);

        // Static platform layout
        let pd = [
            { x: canvas.width * 0.05, y: canvas.height * 0.80, w: canvas.width * 0.32, type: 'normal'  },
            { x: canvas.width * 0.45, y: canvas.height * 0.65, w: 80,                  type: 'moving',  dx: Math.sin(attractFrame * 0.05) * 70 },
            { x: canvas.width * 0.12, y: canvas.height * 0.50, w: 90,                  type: 'enemy'   },
            { x: canvas.width * 0.55, y: canvas.height * 0.36, w: 80,                  type: 'boost'   },
            { x: canvas.width * 0.18, y: canvas.height * 0.20, w: 100,                 type: 'normal'  },
        ];
        for (let pl of pd) {
            let ox = pl.dx || 0;
            if      (pl.type === 'enemy')  { ctx.fillStyle = '#550000'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 12); ctx.fillStyle = '#ff0000'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 3); ctx.save(); ctx.fillStyle='#ff6666'; ctx.font='7px monospace'; ctx.textAlign='center'; ctx.fillText('RATE LIMIT', pl.x+ox+pl.w/2, pl.y-5); ctx.restore(); }
            else if (pl.type === 'boost')  { ctx.fillStyle = '#003300'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 12); ctx.fillStyle = '#00ff66'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 3); ctx.save(); ctx.fillStyle='#00ff66'; ctx.font='7px monospace'; ctx.textAlign='center'; ctx.fillText('GPU BOOST', pl.x+ox+pl.w/2, pl.y-5); ctx.restore(); }
            else if (pl.type === 'moving') { ctx.fillStyle = '#2d0045'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 12); ctx.fillStyle = '#9900cc'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 3); }
            else                           { ctx.fillStyle = '#001a33'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 12); ctx.fillStyle = '#0055cc'; ctx.fillRect(pl.x+ox, pl.y, pl.w, 3); }
            // CTX diamond on safe platforms
            if (pl.type === 'normal') {
                let bx2 = pl.x + (pl.dx||0) + pl.w/2 - 8, by2 = pl.y - 30;
                let hov = Math.sin(attractFrame * 0.08) * 4;
                ctx.save(); ctx.fillStyle = '#00ffff'; ctx.globalAlpha = 0.85;
                ctx.beginPath(); ctx.moveTo(bx2+8,by2+hov); ctx.lineTo(bx2+16,by2+8+hov); ctx.lineTo(bx2+8,by2+16+hov); ctx.lineTo(bx2,by2+8+hov); ctx.closePath(); ctx.fill();
                ctx.globalAlpha=1; ctx.restore();
            }
        }
        // Bouncing Claude
        let bi   = Math.floor(pf / 80) % 3;
        let bp   = pd[bi + 1];
        let bfr  = (pf % 80) / 80;
        let bclY = bp.y - 40 - Math.abs(Math.sin(bfr * Math.PI)) * 80;
        drawSprite(bp.x + (bp.dx||0) + bp.w/2 - 24, bclY, claudeFrame1, COLOR_CLAUDE);
        // Rising floor
        let floorY = canvas.height * 0.95 - (pf * 0.15);
        ctx.fillStyle = 'rgba(255,0,0,0.35)';
        ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(0, floorY, canvas.width, 2);
    }

    // ---- Overlay text ----
    const phaseColors = ['#FFD700', '#ff00ff', '#00ff66'];
    const phaseTitles = ['LEVEL 1: BUG HUNT', 'LEVEL 2: CORRUPTED', 'LEVEL 3: ESCAPE'];
    const phaseLines  = [
        ['JUMP OVER BUGS, FLIES & SINKHOLES', 'COLLECT 1000 TOKENS TO ADVANCE'],
        ['GLITCHES  TIMEOUTS  RATE LIMITS',   'GOLD TOKENS MAY BE HALLUCINATIONS!'],
        ['\u2190 \u2192 MOVE   BOUNCE ON PLATFORMS', 'CYAN DIAMONDS SLOW THE RED FLOOR'],
    ];

    let cw = canvas.width, ch = canvas.height;
    let u  = Math.max(10, Math.min(cw / 30, 24)); // responsive unit

    ctx.save();
    ctx.textAlign = 'center';

    // ---- Level transition title card (first 60 frames of each phase) ----
    if (pf < 60) {
        // Fade in over 20 frames, hold, fade out over 20 frames
        let alpha = pf < 20 ? pf / 20 : pf > 40 ? (60 - pf) / 20 : 1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, 0, cw, ch);

        // Coloured border bars
        ctx.fillStyle = phaseColors[phase];
        ctx.fillRect(0, 0, cw, u * 0.5);
        ctx.fillRect(0, ch - u * 0.5, cw, u * 0.5);

        // Level number label
        ctx.font = `${u * 0.85}px "Press Start 2P", monospace`;
        ctx.fillStyle = phaseColors[phase];
        ctx.shadowColor = phaseColors[phase];
        ctx.shadowBlur = u * 0.8;
        ctx.fillText(phaseTitles[phase], cw / 2, ch / 2 - u * 1.1);
        ctx.shadowBlur = 0;

        // Subtitle lines
        ctx.font = `${u * 0.6}px "Press Start 2P", monospace`;
        ctx.fillStyle = '#cccccc';
        phaseLines[phase].forEach((line, i) => ctx.fillText(line, cw / 2, ch / 2 + u * 0.3 + i * u * 1.0));

        ctx.globalAlpha = 1;
        ctx.restore();
        return; // Skip top/bottom bars during title card
    }

    // Top banner (shown after title card)
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, cw, u * 3.5);
    ctx.fillStyle = phaseColors[phase];
    ctx.font = `bold ${u * 1.1}px "Press Start 2P", monospace`;
    ctx.fillText(phaseTitles[phase], cw / 2, u * 1.5);
    ctx.fillStyle = '#cccccc';
    ctx.font = `${u * 0.65}px "Press Start 2P", monospace`;
    phaseLines[phase].forEach((line, i) => ctx.fillText(line, cw / 2, u * 2.3 + i * u * 0.85));

    // Bottom bar
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, ch - u * 1.8, cw, u * 1.8);
    ctx.fillStyle = (Math.floor(attractFrame / 20) % 2 === 0) ? '#ffffff' : '#666666';
    ctx.font = `${u * 0.7}px "Press Start 2P", monospace`;
    ctx.fillText('PRESS ANY KEY TO PLAY', cw / 2, ch - u * 0.5);
    // Phase indicator dots
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === phase ? '#ffffff' : '#444444';
        ctx.beginPath();
        ctx.arc(cw / 2 - 16 + i * 16, ch - u * 1.35, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ---------------------------------------------------------------------------
// Game Loop
// ---------------------------------------------------------------------------

function updateVertical() {
    // Horizontal movement
    if (moveLeft) player.x -= 6;
    if (moveRight) player.x += 6;
    
    // Wrap around screen
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Vertical Physics
    player.y += player.vy;
    player.vy += GRAVITY * 0.7; // Floatier jump

    // Camera follow player up
    if (player.y < cameraY + canvas.height / 2) {
        let diff = (cameraY + canvas.height / 2) - player.y;
        cameraY -= diff;
        deathFloorY -= diff * 0.5; // Death floor follows up but slower than camera
        score += diff * 0.1; 
    }
    
    // Floor-slow bonus collision (world-space hitbox)
    for (let i = verticalBonuses.length - 1; i >= 0; i--) {
        let b = verticalBonuses[i];
        if (!b.active) continue;
        let bSize = 24;
        if (player.x + player.width > b.x && player.x < b.x + bSize &&
            player.y + player.height > b.y && player.y < b.y + bSize) {
            b.active = false;
            floorSlowTimer += 360; // +6 seconds (stackable)
            if (floorSlowTimer > 720) floorSlowTimer = 720; // cap at 12 s
            spawnExplosion(b.x + 12, b.y + 12, '#00ffff');
            floatTexts.push(new FloatingText(player.x, player.y - cameraY, 'CTX EXPANDED! FLOOR SLOWED', '#00ffff', false, 90));
            collectSfx.currentTime = 0;
            collectSfx.play().catch(e => {});
        }
        // Remove bonuses that scrolled far below camera
        if (b.y > cameraY + canvas.height + 150) verticalBonuses.splice(i, 1);
    }

    // Death floor — frozen during grace period, slow during bonus, normal otherwise
    if (graceFrames > 0) {
        graceFrames--;
    } else if (floorSlowTimer > 0) {
        floorSlowTimer--;
        deathFloorY -= 0.3 + (score * 0.0001); // ~80% slower
    } else {
        deathFloorY -= 1.5 + (score * 0.0005);
    }

    // Collision with platforms (only when falling)
    if (player.vy > 0) {
        let pHitbox = {x: player.x + PIXEL_SIZE*2, w: player.width - PIXEL_SIZE*4, y: player.y + player.height - 5, h: 10};
        
        for (let p of platforms) {
            if (pHitbox.x + pHitbox.w > p.x && pHitbox.x < p.x + p.width &&
                pHitbox.y + pHitbox.h > p.y && pHitbox.y < p.y + p.height) {
                
                // BOUNCE
                player.vy = JUMP_FORCE * 1.3;
                player.y = p.y - player.height;
                player.isJumping = true;
                jumpSfx.currentTime = 0;
                jumpSfx.play().catch(e => {});
                
                if (p.type === 'enemy') {
                    score -= 50;
                    if (score < 0) score = 0;
                    spawnExplosion(player.x, player.y, '#ff0000');
                    floatTexts.push(new FloatingText(player.x, player.y - cameraY, `-50 ${p.label || 'ERROR'}!`, "#ff0000"));
                    triggerShake(10);
                } else if (p.type === 'boost') {
                    player.vy = JUMP_FORCE * 2.2; // Super bounce!
                    score += 100;
                    spawnExplosion(player.x + player.width/2, player.y + player.height, '#00ff66');
                    floatTexts.push(new FloatingText(player.x, player.y - cameraY, "+100 GPU BOOST!", "#00ff66"));
                    collectSfx.currentTime = 0;
                    collectSfx.play().catch(e => {});
                } else {
                    spawnExplosion(player.x + player.width/2, player.y + player.height, '#0066ff');
                }
            }
        }
    }

    // Spawn new platforms as we go up
    let highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform > cameraY) {
        spawnPlatform(cameraY - 50 - Math.random() * 80);
    }
    
    // Remove old platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
        platforms[i].update();
        if (platforms[i].y > cameraY + canvas.height + 100) {
            platforms.splice(i, 1);
        }
    }

    // Death condition
    if (player.y > deathFloorY) {
        die();
    }
}

function drawVertical() {
    ctx.fillStyle = '#110011'; // Matrix dark purple
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        shakeTime--;
    }
    
    // Draw parallax stars
    ctx.fillStyle = '#330033';
    for(let s of stars) {
        let sy = (s.y - cameraY * 0.5) % canvas.height;
        if (sy < 0) sy += canvas.height;
        ctx.fillRect(s.x, sy, s.size, s.size);
    }

    for (let p of platforms) p.draw();

    // Draw floor-slow bonus pickups
    for (let b of verticalBonuses) {
        if (!b.active) continue;
        let sy = b.y - cameraY;
        if (sy < -30 || sy > canvas.height + 30) continue;
        let hover = Math.sin(frameCount * 0.08 + b.hoverOffset) * 4;
        // Cyan glowing diamond
        ctx.save();
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.85 + Math.sin(frameCount * 0.12 + b.hoverOffset) * 0.15;
        ctx.beginPath();
        ctx.moveTo(b.x + 12, sy + hover);
        ctx.lineTo(b.x + 24, sy + 12 + hover);
        ctx.lineTo(b.x + 12, sy + 24 + hover);
        ctx.lineTo(b.x,      sy + 12 + hover);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${PIXEL_SIZE}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('CTX', b.x + 12, sy + 14 + hover);
        ctx.restore();
    }

    // Draw player
    let currentMap = claudeFrame1;
    if (player.vy < -2) currentMap = claudeFrame2; 
    let drawColor = COLOR_CLAUDE;
    if (corruptionTimer > 0) drawColor = '#FF0000';
    drawSprite(player.x, player.y - cameraY, currentMap, drawColor);
    
    for (let p of particles) {
        p.y -= cameraY;
        p.draw();
        p.y += cameraY;
    }
    
    // Draw death floor
    let floorScreenY = deathFloorY - cameraY;
    if (floorScreenY < canvas.height) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(0, floorScreenY, canvas.width, canvas.height - floorScreenY);
        ctx.fillStyle = '#ff0000';
        for (let i=0; i<10; i++) {
            ctx.fillRect(Math.random() * canvas.width, floorScreenY - Math.random() * 20, Math.random() * 30, 2);
        }
    }
    
    ctx.restore();

    // Floor-slow active HUD bar
    if (floorSlowTimer > 0) {
        ctx.save();
        let barW = 140;
        let barH = 10;
        let bx = canvas.width - barW - 10;
        let by = 38;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 2, by - 14, barW + 4, barH + 18);
        ctx.fillStyle = '#00ffff';
        ctx.font = `bold ${PIXEL_SIZE * 1.5}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('FLOOR SLOW', bx, by);
        // Bar background
        ctx.fillStyle = '#003333';
        ctx.fillRect(bx, by + 2, barW, barH);
        // Bar fill (fraction of max 720)
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(bx, by + 2, barW * (floorSlowTimer / 720), barH);
        ctx.restore();
    }

    // Grace period overlay — countdown + control hints
    if (graceFrames > 0) {
        let secsLeft = Math.ceil(graceFrames / 60);
        ctx.save();
        ctx.textAlign = 'center';

        // Dimmed hint panel
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, canvas.height * 0.18, canvas.width, canvas.height * 0.55);

        // Level banner
        ctx.fillStyle = '#00ff66';
        ctx.font = `bold ${PIXEL_SIZE * 3}px "Press Start 2P", monospace`;
        ctx.fillText('LEVEL 3', canvas.width / 2, canvas.height * 0.30);

        // Big countdown
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${PIXEL_SIZE * 10}px "Press Start 2P", monospace`;
        ctx.fillText(secsLeft > 0 ? secsLeft : 'GO!', canvas.width / 2, canvas.height * 0.54);

        // Control hints
        ctx.fillStyle = '#aaaaaa';
        ctx.font = `${PIXEL_SIZE * 1.5}px "Press Start 2P", monospace`;
        ctx.fillText('\u2190 \u2192  TO MOVE', canvas.width / 2, canvas.height * 0.63);
        ctx.fillText('BOUNCE ON PLATFORMS TO CLIMB', canvas.width / 2, canvas.height * 0.69);
        ctx.fillText('AVOID THE RISING RED FLOOR!', canvas.width / 2, canvas.height * 0.75);

        // Platform legend
        ctx.font = `${PIXEL_SIZE * 1.3}px monospace`;
        ctx.fillStyle = '#0055cc'; ctx.fillText('BLUE = SAFE', canvas.width * 0.18, canvas.height * 0.83);
        ctx.fillStyle = '#9900cc'; ctx.fillText('PURPLE = MOVING', canvas.width * 0.5, canvas.height * 0.83);
        ctx.fillStyle = '#ff0000'; ctx.fillText('RED = DANGER', canvas.width * 0.82, canvas.height * 0.83);

        ctx.restore();
    }

    for (let ft of floatTexts) ft.draw();
}

function loop() {
    if (currentLevel === 3) {
        requestAnimationFrame(loop);
        if (isPlaying) {
            frameCount++;
            updateVertical();
        }
        drawVertical();
        if (isGameOver && !isEnteringScore) {
            if (gameOverCountdown > 0) gameOverCountdown--;
            else if (gameOverCountdown === 0) { resetGame(); return; }
        }
        drawGameOverOverlay();
        if (isPlaying && frameCount % 10 === 0) updateScore();
        return;
    }

    requestAnimationFrame(loop);



    // Attract / idle demo mode
    if (attractMode) {
        attractFrame++;
        if (attractFrame >= 720) stopAttract();
        else drawAttract();
        return;
    }
    if (!isPlaying && !isGameOver) {
        idleTimer++;
        if (idleTimer >= 600) startAttract(); // 10 s at 60 fps
    }

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        shakeTime--;
    }
    
    drawParallax();
    
    if (isPlaying) {
        frameCount++;
        if (invincibilityTimer > 0) invincibilityTimer--;
        
        let activeGameSpeed = gameSpeed;
        if (corruptionTimer > 0) {
            corruptionTimer--;
            activeGameSpeed += 8; // CRAZY speed boost!
            
            // Draw horizontal speed lines randomly across screen
            ctx.fillStyle = `rgba(255, 0, 0, ${Math.random() * 0.5})`;
            for (let j = 0; j < 5; j++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 300 + 50, 2);
            }
        }
        
        // Safety: If player somehow goes way above screen, bring them back or reset
        if (player.y < -100) player.y = -100;

        // Spawn Obstacles
        nextObstacleTimer--;
        if (nextObstacleTimer <= 0) {
            let type = 'bug';
            let r = Math.random();
            if (currentLevel === 2) {
                // Level 2: full CLI chaos — all enemy types including new ones
                if (r > 0.80) type = 'glitch';
                else if (r > 0.64) type = 'timeout';       // Fast CLI timeout
                else if (r > 0.50) type = 'fly';
                else if (r > 0.37) type = 'hallucination'; // Fake gold token
                else if (r > 0.24) type = 'hole';
                else if (r > 0.12) type = 'rate_limit';    // Wide 429 blocker
                else type = 'bug';
            } else if (score > 300) {
                if (r > 0.60) type = 'fly';
                else if (r > 0.30) type = 'hole';
                else if (r > 0.08) type = 'bug';
                else type = 'rate_limit'; // Rare surprise in late level 1
            } else if (score > 100) {
                if (r > 0.6) type = 'hole';
            }

            obstacles.push(new Obstacle(type));
            
            let minTimer = Math.max(30, 90 - gameSpeed * 2.5); // Faster spawns in level 2
            let maxTimer = Math.max(60, 160 - gameSpeed * 2.5);
            if (currentLevel === 2) {
                minTimer = Math.max(20, minTimer - 10);
                maxTimer = Math.max(40, maxTimer - 20);
            }
            nextObstacleTimer = Math.floor(Math.random() * (maxTimer - minTimer + 1) + minTimer);
        }

        // Spawn Tokens / Collectibles
        nextFruitTimer--;
        if (nextFruitTimer <= 0) {
            let r = Math.random();
            let fType = 'token';
            if (r > 0.95) fType = 'gpu'; // 5% chance for Invincibility GPU
            else if (r > 0.85) fType = 'context'; // 10% chance for Context Expansion
            else if (r > 0.65) fType = 'corrupted'; // 20% chance for BAD Corrupted Token
            
            collectibles.push(new Collectible(fType));
            nextFruitTimer = Math.floor(Math.random() * 80 + 60); 
        }
        
        player.update();
        
        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.update(activeGameSpeed);
            
            if (obs.type !== 'hole' && checkCollision(player.getHitbox(), obs.getHitbox())) {
                if (invincibilityTimer > 0) {
                    // Smash the bug!
                    obs.markedForDeletion = true;
                    score += 100;
                    spawnExplosion(obs.x, obs.y, COLOR_BUG);
                    triggerShake(5);
                    collectSfx.currentTime = 0;
                    collectSfx.play().catch(e=>{});
                    floatTexts.push(new FloatingText(obs.x, obs.y, "SMASH!", "#FFF"));
                } else {
                    die();
                }
            }
            
            if (obs.markedForDeletion) {
                obstacles.splice(i, 1);
            }
        }

        // Collectibles
        for (let i = collectibles.length - 1; i >= 0; i--) {
            let c = collectibles[i];
            c.update(activeGameSpeed);
            if (checkCollision(player.getHitbox(), c.getHitbox())) {
                if (c.type === 'corrupted') {
                    // Penalty!
                    combo = 0;
                    score -= 500;
                    corruptionTimer = 180; // 3 seconds of speed madness
                    dieSfx.currentTime = 0;
                    dieSfx.play().catch(e => {});
                    triggerShake(10);
                    spawnExplosion(c.x, c.y, '#ff0000');
                    floatTexts.push(new FloatingText(0, 100, "CORRUPTED TOKEN!", "#ff0000", true, 80, 1.5));
                    collectibles.splice(i, 1);
                    updateScore();
                    continue;
                }

                combo++;
                let comboBonus = c.type === 'token' ? 50 * combo : 100 * combo;
                score += comboBonus;
                
                collectSfx.currentTime = 0;
                collectSfx.play().catch(e => {});
                spawnExplosion(c.x, c.y, c.type === 'token' ? '#FFD700' : '#33ccff');
                
                if (c.type === 'token') {
                    floatTexts.push(new FloatingText(c.x, c.y, `+${comboBonus} TKNS`, '#FFD700'));
                } else if (c.type === 'context') {
                    gameSpeed = Math.max(6, gameSpeed - 2.0); 
                    bgm.playbackRate = Math.max(1.0, bgm.playbackRate - 0.2);
                    floatTexts.push(new FloatingText(0, 100, "CONTEXT EXPANDED!", '#33ccff', true, 80, 1.2));
                } else if (c.type === 'gpu') {
                    invincibilityTimer = 400; // ~6.5 seconds of invincibility
                    floatTexts.push(new FloatingText(0, 100, "AGI MODE!", COLOR_GPU, true, 100, 1.5));
                }
                
                // Combo Memes
                if (combo === 3) floatTexts.push(new FloatingText(0, 140, "FEW SHOT!", "#FFF", true, 60));
                if (combo === 5) floatTexts.push(new FloatingText(0, 140, "ZERO SHOT!", "#00FF00", true, 80));
                if (combo === 10) floatTexts.push(new FloatingText(0, 140, "CHAIN OF THOUGHT!", "#FFD700", true, 100, 1.2));
                
                collectibles.splice(i, 1);
                updateScore();
                continue;
            }
            if (c.markedForDeletion) collectibles.splice(i, 1);
        }
        
        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        // Floating Texts
        for (let i = floatTexts.length - 1; i >= 0; i--) {
            floatTexts[i].update();
            if (floatTexts[i].duration <= 0) floatTexts.splice(i, 1);
        }
        
        score += 0.05; // Passive survival score is extremely slow now. You MUST get tokens!
        
        if (score >= 1000 && currentLevel === 1) {
            currentLevel = 2;
            COLOR_BG = '#1a0033'; // Deep synthwave purple
            COLOR_GROUND = '#4d004d'; // Neon pinkish dark
            floatTexts.push(new FloatingText(0, canvas.height/3, "LEVEL 2: WEIGHTS CORRUPTED!", "#ff00ff", true, 100, 1.2));
            triggerShake(20);
            gameSpeed += 2;
            bgm.playbackRate = Math.min(2.5, bgm.playbackRate + 0.1);
            
            // Re-init background colors visually
            for (let c of clouds) c.speed *= 2; // Clouds move faster
        }

        // Level 2 → Level 3: Vertical escape mode
        if (score >= 2000 && currentLevel === 2) {
            currentLevel = 3;
            obstacles = [];
            collectibles = [];
            initVertical();
            // Place player on base platform
            player.x = canvas.width / 2 - player.width / 2;
            player.y = canvas.height - 30 - player.height;
            player.vy = 0;
            player.isJumping = false;
            player.isFalling = false;
            graceFrames = 300;
            floatTexts.push(new FloatingText(0, canvas.height / 3, "LEVEL 3: ESCAPE THE MATRIX!", "#00FF00", true, 150, 1.3));
            triggerShake(30);
            bgm.playbackRate = Math.min(2.5, bgm.playbackRate + 0.2);
        }

        if (frameCount % 240 === 0) { 
            gameSpeed += currentLevel === 2 ? 0.6 : 0.4; // Accelerates faster in level 2
            bgm.playbackRate = Math.min(2.5, bgm.playbackRate + 0.03);
            if (frameCount > 240) {
                floatTexts.push(new FloatingText(0, canvas.height/3, "SPEED UP!", "#FFCC00", true, 60));
            }
        }
        
        if (frameCount % 10 === 0) updateScore();
    }

    updateGround(); 
    if (player) player.draw();
    for (let obs of obstacles) {
        obs.draw();
    }
    for (let c of collectibles) {
        c.draw();
    }
    for (let p of particles) {
        p.draw();
    }
    
    ctx.restore(); // End shake translation
    
    // Draw float texts outside the shake layer so UI doesn't blur
    for (let ft of floatTexts) {
        ft.draw();
    }

    if (isGameOver && !isEnteringScore) {
        if (gameOverCountdown > 0) gameOverCountdown--;
        else if (gameOverCountdown === 0) { resetGame(); return; }
    }
    drawGameOverOverlay();
}

// Init
renderLeaderboard();
resize();
updateScore();
loop();
