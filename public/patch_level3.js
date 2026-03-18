const fs = require('fs');
let code = fs.readFileSync('/data/workspace/claude_jump/public/game.js', 'utf8');

// 1. Add new variables
const varsPatch = `
let currentLevel = 3; // Start directly in Level 3 for debugging
let corruptionTimer = 0; // Speed debuff timer

// --- Level 3 (Vertical) State ---
let platforms = [];
let cameraY = 0;
let deathFloorY = 0;
let moveLeft = false;
let moveRight = false;
`;
code = code.replace(/let currentLevel = 1;([\s\S]*?)function spawnExplosion/, varsPatch + '\nfunction spawnExplosion');

// 2. Add Platform and Vertical Logic
const vertLogic = `
class Platform {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 60 + Math.random() * 40;
        this.height = 10;
        this.type = type; // 'normal', 'moving', 'enemy'
        this.vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
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
        ctx.fillStyle = this.type === 'enemy' ? '#ff0000' : '#4d004d';
        ctx.fillRect(this.x, this.y - cameraY, this.width, this.height);
        ctx.fillStyle = this.type === 'enemy' ? '#ff3333' : '#ff00ff';
        ctx.fillRect(this.x, this.y - cameraY, this.width, 3);
        
        if (this.type === 'enemy') {
            // Draw a little bug on it
            drawSprite(this.x + this.width/2 - 20, this.y - 16 - cameraY, bugMap);
        }
    }
}

function initVertical() {
    platforms = [];
    cameraY = 0;
    deathFloorY = canvas.height;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 100;
    player.vy = JUMP_FORCE; // Initial auto-bounce
    
    // Initial floor platform
    platforms.push(new Platform(0, canvas.height - 20, 'normal'));
    platforms[0].width = canvas.width;
    
    // Generate initial platforms upwards
    let currY = canvas.height - 100;
    for (let i = 0; i < 20; i++) {
        spawnPlatform(currY);
        currY -= (60 + Math.random() * 40);
    }
}

function spawnPlatform(yPos) {
    let r = Math.random();
    let type = 'normal';
    if (r > 0.8) type = 'enemy';
    else if (r > 0.5) type = 'moving';
    
    platforms.push(new Platform(Math.random() * (canvas.width - 100), yPos, type));
}
`;
code = code.replace(/\/\/ --- Entities ---/, vertLogic + '\n// --- Entities ---');

// 3. Update Inputs for L/R
const inputPatch = `
// Inputs
window.addEventListener('keydown', (e) => {
    if (currentLevel < 3) {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            handleInput();
        }
    } else {
        if (e.code === 'ArrowLeft') moveLeft = true;
        if (e.code === 'ArrowRight') moveRight = true;
        if (isGameOver && e.code === 'Space') handleInput();
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') moveLeft = false;
    if (e.code === 'ArrowRight') moveRight = false;
});

canvas.parentElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentLevel < 3 || isGameOver) {
        handleInput();
    } else {
        let touchX = e.touches[0].clientX;
        let rect = canvas.getBoundingClientRect();
        if (touchX < rect.left + rect.width / 2) moveLeft = true;
        else moveRight = true;
    }
}, {passive: false});

canvas.parentElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    moveLeft = false;
    moveRight = false;
}, {passive: false});

canvas.parentElement.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        if (currentLevel < 3 || isGameOver) handleInput();
        else {
            let rect = canvas.getBoundingClientRect();
            if (e.clientX < rect.left + rect.width / 2) moveLeft = true;
            else moveRight = true;
        }
    }
});
window.addEventListener('mouseup', () => {
    moveLeft = false;
    moveRight = false;
});
`;
code = code.replace(/\/\/ Inputs[\s\S]*?\/\/ Game Loop/, inputPatch + '\n// Game Loop');

// 4. Update Loop for Vertical
const loopLogic = `
function updateVertical() {
    frameCount++;
    
    // Player horizontal movement
    if (moveLeft) player.x -= 6;
    if (moveRight) player.x += 6;
    
    // Wrap around screen
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Physics
    player.y += player.vy;
    player.vy += GRAVITY * 0.8; // Slightly floatier

    // Camera follow player upwards
    if (player.y < cameraY + canvas.height / 2) {
        let diff = (cameraY + canvas.height / 2) - player.y;
        cameraY -= diff;
        deathFloorY -= diff * 0.5; // Death floor rises relative to camera too
        score += diff * 0.1; // Score based on height
    }
    
    // Death floor constantly rising
    deathFloorY -= 1 + (score * 0.001); // Speeds up slowly

    // Collision with platforms (falling only)
    if (player.vy > 0) {
        for (let p of platforms) {
            if (
                player.x + player.width > p.x && 
                player.x < p.x + p.width && 
                player.y + player.height > p.y && 
                player.y + player.height < p.y + p.height + player.vy
            ) {
                // Bounce
                player.vy = JUMP_FORCE * 1.2;
                player.y = p.y - player.height;
                jumpSfx.currentTime = 0;
                jumpSfx.play().catch(e => {});
                
                // If enemy platform, hurt!
                if (p.type === 'enemy') {
                    score -= 50;
                    if (score < 0) score = 0;
                    spawnExplosion(player.x, player.y, '#ff0000');
                    floatTexts.push(new FloatingText(player.x, player.y - cameraY, "CORRUPTED NODE!", "#ff0000"));
                    triggerShake(10);
                } else {
                    // Small visual particle bounce
                    spawnExplosion(player.x + player.width/2, player.y + player.height, '#ff00ff');
                }
            }
        }
    }

    // Spawn new platforms as camera goes up
    let highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform > cameraY) {
        spawnPlatform(cameraY - 50 - Math.random() * 50);
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
    
    // Draw parallax stars based on cameraY
    ctx.fillStyle = '#330033';
    for(let s of stars) {
        let sy = (s.y - cameraY * 0.5) % canvas.height;
        if (sy < 0) sy += canvas.height;
        ctx.fillRect(s.x, sy, s.size, s.size);
    }

    for (let p of platforms) p.draw();
    
    // Draw player
    let currentMap = claudeFrame1;
    if (player.vy < -2) currentMap = claudeFrame2; // Jumping sprite
    drawSprite(player.x, player.y - cameraY, currentMap, COLOR_CLAUDE);
    
    for (let p of particles) {
        p.y -= cameraY; // adjust temp
        p.draw();
        p.y += cameraY; // restore
    }
    
    // Draw the rising death floor (Data corruption)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    let floorScreenY = deathFloorY - cameraY;
    if (floorScreenY < canvas.height) {
        ctx.fillRect(0, floorScreenY, canvas.width, canvas.height - floorScreenY);
        // Corruption glitch effect
        ctx.fillStyle = '#ff0000';
        for (let i=0; i<10; i++) {
            ctx.fillRect(Math.random() * canvas.width, floorScreenY - Math.random() * 20, Math.random() * 30, 2);
        }
    }
    
    ctx.restore();
    
    for (let ft of floatTexts) ft.draw();
    if (frameCount % 10 === 0) updateScore();
}

// Intercept main loop
const oldLoopBody = \`
`;
code = code.replace(/function loop\(\) \{/, 'function horizontalLoop() {');
code = code.replace(/loop\(\);/, 'requestAnimationFrame(loop);'); // Fix bottom call

const newLoop = `
function loop() {
    requestAnimationFrame(loop);
    if (!isPlaying && !isGameOver) return; // Wait to start
    
    if (currentLevel === 3) {
        if (isPlaying) updateVertical();
        drawVertical();
    } else {
        horizontalLoop();
    }
}
`;
code = code.replace(/function horizontalLoop\(\) \{/, loopLogic + '\n' + newLoop + '\nfunction horizontalLoop() {');

// Fix recursive loop call in horizontal
code = code.replace(/requestAnimationFrame\(loop\);/g, ''); // Remove all inside functions, re-add where needed
code = code.replace(/function horizontalLoop\(\) \{/, 'function horizontalLoop() {\n');

// Also inject initVertical() into resetGame()
code = code.replace(/currentLevel = 1;/, 'currentLevel = 3; if (currentLevel === 3) initVertical();');

fs.writeFileSync('/data/workspace/claude_jump/public/game.js', code);
