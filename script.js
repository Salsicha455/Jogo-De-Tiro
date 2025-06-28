const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const lifeEl = document.getElementById('life');
const scoreEl = document.getElementById('score');
const difficultyEl = document.getElementById('difficulty');
const gameOverMessage = document.getElementById('gameOverMessage');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let player, bullets, zombies, keys;
let score, canShoot, difficultyLevel, baseZombieSpeed, spawnInterval, spawnTimer;
let gameRunning = false;
let animationId = null;

function initGame() {
  console.clear();
  console.log('Init game');

  player = {
    x: canvas.width / 2 - 20,
    y: canvas.height / 2 - 20,
    width: 40,
    height: 40,
    color: 'lime',
    life: 3
  };

  bullets = [];
  zombies = [];
  keys = {};

  score = 0;
  canShoot = true;
  difficultyLevel = 0;
  baseZombieSpeed = 1;
  spawnInterval = 1200;
  gameRunning = true;

  updateHUD();
  gameOverMessage.style.display = 'none';

  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnZombie, spawnInterval);

  if (!animationId) {
    animationId = requestAnimationFrame(draw);
  }
}

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0 || !canShoot || !gameRunning) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const startX = player.x + player.width / 2;
  const startY = player.y + player.height / 2;

  const dx = mouseX - startX;
  const dy = mouseY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const speed = 5;
  const dirX = (dx / dist) * speed;
  const dirY = (dy / dist) * speed;

  bullets.push({ x: startX, y: startY, width: 4, height: 4, vx: dirX, vy: dirY });

  canShoot = false;
  setTimeout(() => canShoot = true, 200);
});

function movePlayer() {
  const speed = 3;
  if (keys['arrowup'] || keys['w']) player.y -= speed;
  if (keys['arrowdown'] || keys['s']) player.y += speed;
  if (keys['arrowleft'] || keys['a']) player.x -= speed;
  if (keys['arrowright'] || keys['d']) player.x += speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function spawnZombie() {
  if (!gameRunning) return;

  console.log('spawnZombie chamado');

  let edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) { x = Math.random() * canvas.width; y = -40; }
  if (edge === 1) { x = Math.random() * canvas.width; y = canvas.height + 40; }
  if (edge === 2) { x = -40; y = Math.random() * canvas.height; }
  if (edge === 3) { x = canvas.width + 40; y = Math.random() * canvas.height; }

  zombies.push({
    x: x,
    y: y,
    width: 40,
    height: 40,
    speed: baseZombieSpeed + difficultyLevel * 0.2,
    color: 'green'
  });
}

function updateDifficulty() {
  difficultyLevel = Math.floor(score / 500);
  const newInterval = Math.max(300, spawnInterval - difficultyLevel * 100);

  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnZombie, newInterval);
}

function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function updateHUD() {
  lifeEl.textContent = player.life;
  scoreEl.textContent = score;
  difficultyEl.textContent = difficultyLevel;
}

function drawUI() {
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.fillText('Vida: ' + player.life, 10, 20);
  ctx.fillText('Pontuação: ' + score, canvas.width - 160, 20);
  ctx.fillText('Dificuldade: ' + difficultyLevel, 10, 40);
}

function draw() {
  if (!gameRunning) {
    animationId = null;
    console.log('Jogo parado');
    return;
  }

  console.log('draw executando');

  movePlayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha o player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Atualiza e desenha balas
  ctx.fillStyle = 'red';
  bullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
  });
  bullets = bullets.filter(b => b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height);
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  // Atualiza zumbis e checa colisões
  ctx.fillStyle = 'green';

  let zombiesToRemove = new Set();
  let bulletsToRemove = new Set();

  zombies.forEach((z, zi) => {
    let dx = (player.x + player.width / 2) - (z.x + z.width / 2);
    let dy = (player.y + player.height / 2) - (z.y + z.height / 2);
    let dist = Math.sqrt(dx * dx + dy * dy);
    let dirX = dx / dist;
    let dirY = dy / dist;

    z.x += dirX * z.speed;
    z.y += dirY * z.speed;

    bullets.forEach((b, bi) => {
      if (isColliding(b, z)) {
        zombiesToRemove.add(zi);
        bulletsToRemove.add(bi);
        const scoreMultiplier = 1 + difficultyLevel * 0.5;
        score += Math.floor(100 * scoreMultiplier);
        updateDifficulty();
        updateHUD();
      }
    });

    if (isColliding(player, z)) {
      zombiesToRemove.add(zi);
      player.life -= 1;
      updateHUD();
      if (player.life <= 0) {
        endGame();
      }
    }
  });

  zombies = zombies.filter((_, i) => !zombiesToRemove.has(i));
  bullets = bullets.filter((_, i) => !bulletsToRemove.has(i));

  zombies.forEach(z => ctx.fillRect(z.x, z.y, z.width, z.height));

  drawUI();

  animationId = requestAnimationFrame(draw);
}

function endGame() {
  gameRunning = false;
  if(spawnTimer) clearInterval(spawnTimer);
  if(animationId) cancelAnimationFrame(animationId);
  animationId = null;
  finalScoreEl.textContent = score;
  gameOverMessage.style.display = 'block';
  console.log('Game Over');
}

restartBtn.addEventListener('click', () => {
  initGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Página oculta: pausa o jogo');
    gameRunning = false;
    if(spawnTimer) clearInterval(spawnTimer);
    if(animationId) cancelAnimationFrame(animationId);
    animationId = null;
  } else {
    console.log('Página visível: retoma o jogo');
    if (player.life > 0) {
      gameRunning = true;
      updateDifficulty();
      if (!animationId) {
        animationId = requestAnimationFrame(draw);
      }
    }
  }
});

initGame();
