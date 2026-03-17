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
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const GROUND_Y = 240;

// Colors
const COLOR_BG = '#242424';
const COLOR_CLAUDE = '#D97757'; // Anthropic Orange/Peach
const COLOR_BUG = '#e54343'; // Error Red
const COLOR_GROUND = '#555555';

// Handle resizing
function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Sprites ---
const PIXEL_SIZE = 4; // Scale factor

// Claude Mascot Sprite (10x8)
const claudeMap = [
    "   ████   ",
    "  ██████  ",
    "████  ████",
    "██████████",
    " ████████ ",
    "   ████   ",
    "  ██  ██  ",
    " ██    ██ "
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

function drawSprite(x, y, map, color) {
    ctx.fillStyle = color;
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            if (map[r][c] === '█') {
                ctx.fillRect(x + c * PIXEL_SIZE, y + r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
}

// --- Entities ---
class Player {
    constructor() {
        this.width = 10 * PIXEL_SIZE;
        this.height = 8 * PIXEL_SIZE;
        this.x = 50;
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
        // Simple walking animation (bobbing)
        let offsetY = (!this.isJumping && frameCount % 20 < 10) ? 2 : 0;
        drawSprite(this.x, this.y + offsetY, claudeMap, COLOR_CLAUDE);
    }
    
    getHitbox() {
        // Slightly smaller hitbox than actual sprite width/height for fairness
        return {
            x: this.x + PIXEL_SIZE,
            y: this.y + PIXEL_SIZE,
            w: this.width - PIXEL_SIZE * 2,
            h: this.height - PIXEL_SIZE * 2
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
        // Animated bug legs
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

function initGround() {
    groundDots = [];
    for(let i=0; i<50; i++) {
        groundDots.push({
            x: Math.random() * canvas.width,
            y: GROUND_Y + Math.random() * 40
        });
    }
}

function updateGround() {
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);
    
    // Draw ground noise
    for(let i=0; i<groundDots.length; i++) {
        let dot = groundDots[i];
        dot.x -= gameSpeed * 0.8; // Parallax effect
        if (dot.x < 0) {
            dot.x = canvas.width;
            dot.y = GROUND_Y + Math.random() * 40;
        }
        ctx.fillRect(dot.x, dot.y, 2, 2);
    }
}

// --- Core Logic ---
function resetGame() {
    player = new Player();
    obstacles = [];
    score = 0;
    gameSpeed = 6;
    frameCount = 0;
    nextObstacleTimer = 60;
    initGround();
    
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

let isRestarting = false;

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
window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, {passive: false});

// Game Loop
function loop() {
    requestAnimationFrame(loop);
    
    // Clear screen
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (isPlaying) {
        frameCount++;
        
        // Spawn obstacles
        nextObstacleTimer--;
        if (nextObstacleTimer <= 0) {
            obstacles.push(new Obstacle());
            // Randomize next spawn, getting slightly tighter as speed increases
            let minTimer = Math.max(30, 80 - gameSpeed * 2);
            let maxTimer = Math.max(60, 150 - gameSpeed * 2);
            nextObstacleTimer = Math.floor(Math.random() * (maxTimer - minTimer + 1) + minTimer);
        }
        
        // Update entities
        player.update();
        
        // Check collisions & update obstacles
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
        
        // Score & Difficulty
        score += 0.1;
        if (frameCount % 600 === 0) { // Every ~10 seconds
            gameSpeed += 0.5; // Increase speed
        }
        
        if (frameCount % 10 === 0) {
            updateScore();
        }
    }

    // Draw everything
    updateGround();
    if (player) player.draw();
    for (let obs of obstacles) {
        obs.draw();
    }
}

// Start loop
updateScore();
loop();
