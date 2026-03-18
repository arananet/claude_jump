const fs = require('fs');
let code = fs.readFileSync('/data/workspace/claude_jump/public/game.js', 'utf8');

if (!code.includes('let currentLevel = 3')) {
    code = code.replace(/let currentLevel = 1;/g, 'let currentLevel = 3;');
    
    // Add L3 state
    const L3State = `
let platforms = [];
let cameraY = 0;
let deathFloorY = 0;
let moveLeft = false;
let moveRight = false;

class Platform {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 60 + Math.random() * 40;
        this.height = 10;
        this.type = type; // 'normal', 'moving', 'enemy'
        this.vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
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
            drawSprite(this.x + this.width/2 - 16, this.y - 28 - cameraY, bugMap);
        }
    }
}

function initVertical() {
    platforms = [];
    cameraY = 0;
    deathFloorY = canvas.height;
    
    // Base platform
    platforms.push(new Platform(0, canvas.height - 20, 'normal'));
    platforms[0].width = canvas.width;
    
    // Generate up
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
    code = code.replace(/let currentLevel = 3;/, 'let currentLevel = 3;\n' + L3State);

    // Modify resetGame to init L3
    code = code.replace(/currentLevel = 3;/, 'currentLevel = 3;\n    if (currentLevel === 3) initVertical();');

    // Input handlers
    const L3Input = `
window.addEventListener('keydown', (e) => {
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
`;
    code = code.replace(/\/\/ Inputs/, L3Input + '\n// Inputs');

    // Main Loop Intercept
    const verticalLoop = `
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
    
    // Death floor constantly rising
    deathFloorY -= 1.5 + (score * 0.0005); 

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
                    floatTexts.push(new FloatingText(player.x, player.y - cameraY, "-50 CORRUPTED!", "#ff0000"));
                    triggerShake(10);
                } else {
                    spawnExplosion(player.x + player.width/2, player.y + player.height, '#ff00ff');
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
    
    for (let ft of floatTexts) ft.draw();
}
`;
    code = code.replace(/function loop\(\) \{/, verticalLoop + '\nfunction loop() {\n    if (currentLevel === 3 && isPlaying) {\n        updateVertical();\n        drawVertical();\n        if (frameCount % 10 === 0) updateScore();\n        requestAnimationFrame(loop);\n        return;\n    }\n');

    fs.writeFileSync('/data/workspace/claude_jump/public/game.js', code);
}
