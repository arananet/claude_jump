const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Game state
let isPlaying = false;
let isGameOver = false;
let frameCount = 0;
let score = 0;
let highScore = localStorage.getItem('claudeJumpHighScore') || 0;
let gameSpeed = 5;

// Physics
let GROUND_Y = 240;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;

// Colors
const COLOR_BG = '#242424';
const COLOR_CLAUDE = '#D46B4E'; // Adjusted to match the specific CLI Anthropic Peach/Orange
const COLOR_BUG = '#e54343'; 
const COLOR_GROUND = '#555555';
const COLOR_CLAUDE_EYE = '#000000'; // Black eyes as in the image

// Handle resizing
function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    // Keep ground near bottom, with some padding
    GROUND_Y = canvas.height - Math.max(40, canvas.height * 0.15);
    initGround();
    
    if (player && player.y >= GROUND_Y - player.height) {
        player.y = GROUND_Y - player.height;
    }
}
window.addEventListener('resize', resize);

// --- Sprites ---
const PIXEL_SIZE = 4; // Scale factor

// Claude Mascot Sprite Frames (12x10) based on exact image layout
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

// Enemy Bug Sprite (10x7)
const bugMap = [
    "   ████   ",
    "  ██  ██  ",
    " ████████ ",
    "██ ████ ██",
    "██████████",
    " ████████ ",
    "  ██  ██  "
];

function drawSprite(x, y, map, defaultColor) {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            let char = map[r][c];
            if (char === ' ') continue;
            
            if (char === '1' || char === '█') ctx.fillStyle = defaultColor;
            else if (char === '3') ctx.fillStyle = COLOR_CLAUDE_EYE;
            
            ctx.fillRect(x + c * PIXEL_SIZE, y + r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
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
    }

    jump() {
        if (!this.isJumping) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
        }
    }

    update() {
        this.y += this.vy;
        this.vy += GRAVITY;

        // Ground collision
        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.isJumping = false;
        }
    }

    draw() {
        let currentMap = claudeFrame1;
        // Animate legs when running on the ground
        if (!this.isJumping && isPlaying) {
            if (Math.floor(frameCount / 6) % 2 === 0) {
                currentMap = claudeFrame2;
            }
        }
        drawSprite(this.x, this.y, currentMap, COLOR_CLAUDE);
    }
    
    getHitbox() {
        // Tighten hitbox slightly to be forgiving
        return {
            x: this.x + PIXEL_SIZE * 2,
            y: this.y + PIXEL_SIZE * 2,
            w: this.width - PIXEL_SIZE * 4,
            h: this.height - PIXEL_SIZE * 3
        };
    }
}

class Obstacle {
    constructor() {
        this.width = 10 * PIXEL_SIZE;
        this.height = 7 * PIXEL_SIZE;
        this.x = canvas.width;
        this.y = GROUND_Y - this.height;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        let offsetY = (frameCount % 16 < 8) ? -2 : 0;
        drawSprite(this.x, this.y + offsetY, bugMap, COLOR_BUG);
    }

    getHitbox() {
        return {
            x: this.x + PIXEL_SIZE,
            y: this.y + PIXEL_SIZE,
            w: this.width - PIXEL_SIZE * 2,
            h: this.height - PIXEL_SIZE * 2
        };
    }
}

// --- Game Variables ---
let player;
let obstacles = [];
let nextObstacleTimer = 0;
let groundDots = [];
let isRestarting = false;

function initGround() {
    groundDots = [];
    for(let i=0; i<50; i++) {
        groundDots.push({
            x: Math.random() * canvas.width,
            y: GROUND_Y + Math.random() * (canvas.height - GROUND_Y)
        });
    }
}

function updateGround() {
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);
    
    for(let i=0; i<groundDots.length; i++) {
        let dot = groundDots[i];
        dot.x -= gameSpeed * 0.8;
        if (dot.x < 0) {
            dot.x = canvas.width;
            dot.y = GROUND_Y + Math.random() * (canvas.height - GROUND_Y);
        }
        ctx.fillRect(dot.x, dot.y, 2, 2);
    }
}

// --- Core Logic ---
function resetGame() {
    player = new Player();
    obstacles = [];
    score = 0;
    gameSpeed = Math.min(canvas.width / 100, 6); 
    frameCount = 0;
    nextObstacleTimer = 60;
    
    isPlaying = true;
    isGameOver = false;
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    updateScore();
}

function updateScore() {
    scoreDisplay.innerHTML = `SCORE: ${Math.floor(score).toString().padStart(5, '0')} &nbsp;&nbsp; HI: ${Math.floor(highScore).toString().padStart(5, '0')}`;
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.h + rect1.y > rect2.y
    );
}

function die() {
    isPlaying = false;
    isGameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('claudeJumpHighScore', highScore);
    }
    updateScore();
    gameOverScreen.classList.remove('hidden');
}

function handleInput() {
    if (!isPlaying && !isGameOver) {
        resetGame();
    } else if (isPlaying) {
        player.jump();
    } else if (isGameOver && !isRestarting) {
        isRestarting = true;
        setTimeout(() => { 
            resetGame(); 
            isRestarting = false; 
        }, 300);
    }
}

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

// Game Loop
function loop() {
    requestAnimationFrame(loop);
    
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (isPlaying) {
        frameCount++;
        
        nextObstacleTimer--;
        if (nextObstacleTimer <= 0) {
            obstacles.push(new Obstacle());
            let minTimer = Math.max(30, 80 - gameSpeed * 2);
            let maxTimer = Math.max(60, 150 - gameSpeed * 2);
            nextObstacleTimer = Math.floor(Math.random() * (maxTimer - minTimer + 1) + minTimer);
        }
        
        player.update();
        
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.update();
            
            if (checkCollision(player.getHitbox(), obs.getHitbox())) {
                die();
            }
            
            if (obs.markedForDeletion) {
                obstacles.splice(i, 1);
            }
        }
        
        score += 0.1;
        if (frameCount % 600 === 0) {
            gameSpeed += 0.5;
        }
        
        if (frameCount % 10 === 0) {
            updateScore();
        }
    }

    updateGround();
    if (player) player.draw();
    for (let obs of obstacles) {
        obs.draw();
    }
}

// Init
resize(); // Call once to set dimensions
updateScore();
loop();
