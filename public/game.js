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

// Audio
const bgm = new Audio('music/ES_8-bit%20Sheriff%20-%20Wave%20Saver.mp3');
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
let highScores = JSON.parse(localStorage.getItem('claudeJumpScoresList')) || [
    { initials: 'EDU', score: 500 },
    { initials: 'SDA', score: 400 },
    { initials: 'CLD', score: 300 },
    { initials: 'BOT', score: 200 },
    { initials: 'ANT', score: 100 }
];
let topScore = highScores.length > 0 ? highScores[0].score : 0;
let isEnteringScore = false;
let gameSpeed = 5;

// Physics
let GROUND_Y = 240;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;

// Colors
const COLOR_BG = '#242424';
const COLOR_CLAUDE = '#D46B4E'; 
const COLOR_BUG = '#e54343'; 
const COLOR_GROUND = '#555555';
const COLOR_CLAUDE_EYE = '#000000';
const COLOR_APPLE = '#ff3366';
const COLOR_BERRY = '#33ccff';
const COLOR_FRUIT_LEAF = '#33cc66';

// Handle resizing
function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    GROUND_Y = canvas.height - Math.max(40, canvas.height * 0.15);
    initGround();
    
    if (player && player.y >= GROUND_Y - player.height && !player.isFalling) {
        player.y = GROUND_Y - player.height;
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
    "   4444   ",
    "  44  44  ",
    " 44444444 ",
    "44 4444 44",
    "4444444444",
    " 44444444 ",
    "  44  44  "
];

const flyMap1 = [
    "  4444  ",
    "44 44 44",
    " 444444 ",
    "   44   "
];

const flyMap2 = [
    "   44   ",
    "44444444",
    " 444444 ",
    "  4  4  "
];

const fruitMap = [
    "   55   ",
    "  6666  ",
    " 666666 ",
    " 666666 ",
    "  6666  "
];

function drawSprite(x, y, map, overrideColor = null) {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            let char = map[r][c];
            if (char === ' ') continue;
            
            if (char === '1') ctx.fillStyle = COLOR_CLAUDE;
            else if (char === '3') ctx.fillStyle = COLOR_CLAUDE_EYE;
            else if (char === '4') ctx.fillStyle = COLOR_BUG;
            else if (char === '5') ctx.fillStyle = COLOR_FRUIT_LEAF;
            else if (char === '6') ctx.fillStyle = overrideColor;
            
            ctx.fillRect(x + c * PIXEL_SIZE, y + r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
    }
}

// --- Effects ---
class FloatingText {
    constructor(x, y, text, color, isStatic = false, duration = 60) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.isStatic = isStatic;
        this.maxDuration = duration;
        this.duration = duration;
    }
    update() {
        this.duration--;
        if (!this.isStatic) this.y -= 1;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.duration / this.maxDuration);
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        
        if (this.isStatic) {
            ctx.font = '24px "Press Start 2P", Courier';
            // Subtle pulse for static text
            let scale = 1 + Math.sin(frameCount * 0.2) * 0.05;
            ctx.translate(canvas.width / 2, this.y);
            ctx.scale(scale, scale);
            ctx.fillText(this.text, 0, 0);
        } else {
            ctx.font = '14px "Press Start 2P", Courier';
            ctx.fillText(this.text, this.x + 20, this.y);
        }
        ctx.restore();
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
        drawSprite(this.x, this.y, currentMap);
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
            this.width = 10 * PIXEL_SIZE;
            this.height = 7 * PIXEL_SIZE;
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
        }
    }

    update() {
        this.x -= gameSpeed;
        
        // Bouncing logic for flying bugs
        if (this.type === 'fly') {
            this.y = this.baseY + Math.sin(frameCount * 0.1 + this.bounceOffset) * 15;
        }
        
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        if (this.type === 'bug') {
            let offsetY = (frameCount % 16 < 8) ? -2 : 0;
            drawSprite(this.x, this.y + offsetY, bugMap);
        } else if (this.type === 'fly') {
            let flyMap = (frameCount % 12 < 6) ? flyMap1 : flyMap2;
            drawSprite(this.x, this.y, flyMap);
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
        this.type = type; // 'apple' (+50 score) or 'berry' (slow down)
        this.width = 8 * PIXEL_SIZE;
        this.height = 5 * PIXEL_SIZE;
        this.x = canvas.width;
        this.y = Math.random() > 0.5 ? GROUND_Y - this.height - 40 : GROUND_Y - this.height - 10;
        this.markedForDeletion = false;
        this.hoverOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw() {
        let yOffset = Math.sin(frameCount * 0.1 + this.hoverOffset) * 4;
        let color = this.type === 'apple' ? COLOR_APPLE : COLOR_BERRY;
        drawSprite(this.x, this.y + yOffset, fruitMap, color);
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
let nextObstacleTimer = 0;
let nextFruitTimer = 0;
let groundDots = [];
let isRestarting = false;
let gameOverTime = 0;

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

    for(let obs of obstacles) {
        if (obs.type === 'hole') {
            ctx.fillStyle = COLOR_BG;
            ctx.fillRect(obs.x, GROUND_Y, obs.width, canvas.height - GROUND_Y);
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
    scoreDisplay.innerHTML = `SCORE: ${Math.floor(score).toString().padStart(5, '0')} &nbsp;&nbsp; HI: ${Math.floor(topScore).toString().padStart(5, '0')}`;
}

// --- Core Logic ---
function resetGame() {
    player = new Player();
    obstacles = [];
    collectibles = [];
    floatTexts = [];
    score = 0;
    gameSpeed = Math.min(canvas.width / 100, 6); 
    frameCount = 0;
    nextObstacleTimer = 60;
    nextFruitTimer = 120;
    
    isPlaying = true;
    isGameOver = false;
    
    bgm.playbackRate = 1.0;
    bgm.currentTime = 0;
    bgm.play().catch(e => {});
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    updateScore();
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
    if (isGameOver) return;
    isPlaying = false;
    isGameOver = true;
    gameOverTime = Date.now();
    
    bgm.pause();
    dieSfx.currentTime = 0;
    dieSfx.play().catch(e => {});

    let lowestHighScore = highScores.length < 5 ? 0 : highScores[highScores.length-1].score;
    
    if (score > lowestHighScore) {
        isEnteringScore = true;
        newHighscoreBox.classList.remove('hidden');
        restartText.classList.add('hidden');
        initialsInput.value = '';
        setTimeout(() => initialsInput.focus(), 100);
    } else {
        isEnteringScore = false;
        newHighscoreBox.classList.add('hidden');
        restartText.classList.remove('hidden');
    }
    
    updateScore();
    gameOverScreen.classList.remove('hidden');
}

if(submitScoreBtn) {
    submitScoreBtn.addEventListener('click', saveNewScore);
}
if(initialsInput) {
    initialsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveNewScore();
    });
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
    restartText.classList.remove('hidden');
}

function handleInput() {
    if (isEnteringScore) return;
    
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
        
        // Spawn Obstacles
        nextObstacleTimer--;
        if (nextObstacleTimer <= 0) {
            let type = 'bug';
            let r = Math.random();
            if (score > 150) {
                if (r > 0.6) type = 'fly';
                else if (r > 0.3) type = 'hole';
            } else if (score > 50) {
                if (r > 0.6) type = 'hole';
            }

            obstacles.push(new Obstacle(type));
            
            let minTimer = Math.max(40, 90 - gameSpeed * 2);
            let maxTimer = Math.max(70, 160 - gameSpeed * 2);
            nextObstacleTimer = Math.floor(Math.random() * (maxTimer - minTimer + 1) + minTimer);
        }

        // Spawn Fruits (more frequently)
        nextFruitTimer--;
        if (nextFruitTimer <= 0) {
            // 20% chance for a berry, 80% for an apple
            let fType = Math.random() > 0.8 ? 'berry' : 'apple';
            collectibles.push(new Collectible(fType));
            nextFruitTimer = Math.floor(Math.random() * 80 + 80); // Spawn faster
        }
        
        player.update();
        
        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.update();
            
            if (obs.type !== 'hole' && checkCollision(player.getHitbox(), obs.getHitbox())) {
                die();
            }
            
            if (obs.markedForDeletion) {
                obstacles.splice(i, 1);
            }
        }

        // Fruits
        for (let i = collectibles.length - 1; i >= 0; i--) {
            let c = collectibles[i];
            c.update();
            if (checkCollision(player.getHitbox(), c.getHitbox())) {
                collectSfx.currentTime = 0;
                collectSfx.play().catch(e => {});
                
                if (c.type === 'apple') {
                    score += 50;
                    floatTexts.push(new FloatingText(c.x, c.y, "+50", COLOR_APPLE));
                } else if (c.type === 'berry') {
                    score += 100;
                    gameSpeed = Math.max(5, gameSpeed - 1.5); // Slow down the game!
                    bgm.playbackRate = Math.max(1.0, bgm.playbackRate - 0.1);
                    floatTexts.push(new FloatingText(0, 100, "TIME SLOW!", COLOR_BERRY, true, 80));
                }
                
                collectibles.splice(i, 1);
                updateScore();
                continue;
            }
            if (c.markedForDeletion) collectibles.splice(i, 1);
        }
        
        // Floating Texts
        for (let i = floatTexts.length - 1; i >= 0; i--) {
            floatTexts[i].update();
            if (floatTexts[i].duration <= 0) floatTexts.splice(i, 1);
        }
        
        score += 0.1;
        
        // Ramp up and show SPEED UP!
        if (frameCount % 300 === 0) {
            gameSpeed += 0.3;
            bgm.playbackRate = Math.min(2.0, bgm.playbackRate + 0.02);
            if (frameCount > 300) {
                // Flash message in center
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
    for (let ft of floatTexts) {
        ft.draw();
    }
}

// Init
renderLeaderboard();
resize();
updateScore();
loop();
