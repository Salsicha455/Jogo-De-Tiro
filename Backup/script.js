// script.js com tela inicial, nome do jogador, volume configurável e pontuações anteriores

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const lifeEl = document.getElementById('life');
const scoreEl = document.getElementById('score');
const difficultyEl = document.getElementById('difficulty');
const gameOverMessage = document.getElementById('gameOverMessage');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

let pauseOverlay = document.createElement('div');
pauseOverlay.id = 'pauseOverlay';
pauseOverlay.style.position = 'fixed';
pauseOverlay.style.top = '0';
pauseOverlay.style.left = '0';
pauseOverlay.style.width = '100%';
pauseOverlay.style.height = '100%';
pauseOverlay.style.background = 'rgba(0,0,0,0.8)';
pauseOverlay.style.display = 'none';
pauseOverlay.style.color = 'white';
pauseOverlay.style.zIndex = '30';
pauseOverlay.style.textAlign = 'center';
pauseOverlay.style.paddingTop = '20vh';
pauseOverlay.innerHTML = '<h2>PAUSADO</h2><p>Pressione P para continuar</p><div id="lastScores"></div>';
document.body.appendChild(pauseOverlay);

let lastScores = JSON.parse(localStorage.getItem('scores') || '[]');
let playerName = '';

// TELA DE INÍCIO
let startScreen = document.createElement('div');
startScreen.id = 'startScreen';
startScreen.style.position = 'fixed';
startScreen.style.top = '0';
startScreen.style.left = '0';
startScreen.style.width = '100%';
startScreen.style.height = '100%';
startScreen.style.background = '#111';
startScreen.style.color = 'white';
startScreen.style.display = 'flex';
startScreen.style.flexDirection = 'column';
startScreen.style.alignItems = 'center';
startScreen.style.justifyContent = 'center';
startScreen.style.zIndex = '40';
startScreen.innerHTML = `
  <h1>Zombie Shooter</h1>
  <label>Nome do jogador: <input id="playerNameInput" type="text" /></label>
  <label>Volume: <input id="volumeControl" type="range" min="0" max="1" step="0.01" value="0.5" /></label>
  <button id="startBtn">Começar Jogo</button>
  <h3>Pontuações anteriores:</h3>
  <ul id="previousScores">${lastScores.map(s => `<li>${s.name}: ${s.score}</li>`).join('')}</ul>
`;
document.body.appendChild(startScreen);

document.getElementById('startBtn').onclick = () => {
  playerName = document.getElementById('playerNameInput').value || 'Jogador';
  const vol = parseFloat(document.getElementById('volumeControl').value);
  [shootSound, hitSound, loseSound].forEach(s => s.volume = vol);
  startScreen.style.display = 'none';
  initGame();
};

// Sons
const shootSound = new Audio('shoot.mp3');
const hitSound = new Audio('hit.mp3');
const loseSound = new Audio('lose.mp3');

// Resto do código igual, com modificação no endGame:
function endGame() {
  gameRunning = false;
  if (spawnTimer) clearInterval(spawnTimer);
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  finalScoreEl.textContent = score;
  gameOverMessage.style.display = 'block';
  lastScores.unshift({ name: playerName, score });
  localStorage.setItem('scores', JSON.stringify(lastScores.slice(0, 10)));
  document.getElementById('lastScores').innerHTML = `<h3>Resultados:</h3><ul>${lastScores.slice(0, 5).map(s => `<li>${s.name}: ${s.score}</li>`).join('')}</ul>`;
}

function initGame() {
  player = {
    x: canvas.width / 2 - 20,
    y: canvas.height / 2 - 20,
    width: 40,
    height: 40,
    life: 3
  };

  bullets = [];
  zombies = [];
  bulletTrail = [];
  keys = {};
  score = 0;
  canShoot = true;
  difficultyLevel = 0;
  baseZombieSpeed = 1;
  spawnInterval = 1200;
  gameRunning = true;
  paused = false;

  updateHUD();
  gameOverMessage.style.display = 'none';
  pauseOverlay.style.display = 'none';

  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnZombie, spawnInterval);

  if (!animationId) {
    animationId = requestAnimationFrame(draw);
  }
}

document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'p') {
    paused = !paused;
    pauseOverlay.style.display = paused ? 'block' : 'none';
    if (!paused && gameRunning) {
      animationId = requestAnimationFrame(draw);
    }
    return;
  }
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0 || !canShoot || !gameRunning || paused) return;

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
  shootSound.currentTime = 0;
  shootSound.play();

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
  if (!gameRunning || zombies.length >= 15 || paused) return;

  const enemiesToSpawn = Math.min(15 - zombies.length, 1 + Math.floor(difficultyLevel / 2));

  for (let i = 0; i < enemiesToSpawn; i++) {
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
      speed: Math.min(6, baseZombieSpeed + difficultyLevel * 0.2)
    });
  }
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

function draw() {
  if (!gameRunning || paused) {
    animationId = null;
    return;
  }

  movePlayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bulletTrail.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, alpha: 1 });
  bulletTrail = bulletTrail.slice(-20);

  bulletTrail.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${t.alpha})`;
    ctx.fill();
    t.alpha -= 0.05;
  });

  // Jogador
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'lime';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff88';
  ctx.stroke();
  ctx.closePath();

  // Balas
  ctx.fillStyle = 'red';
  bullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
  bullets = bullets.filter(b => b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height);

  // Zumbis
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
        hitSound.currentTime = 0;
        hitSound.play();
        updateDifficulty();
        updateHUD();
      }
    });

    if (isColliding(player, z)) {
      zombiesToRemove.add(zi);
      player.life -= 1;
      updateHUD();
      if (player.life <= 0) {
        loseSound.play();
        endGame();
      }
    }
  });

  zombies = zombies.filter((_, i) => !zombiesToRemove.has(i));
  bullets = bullets.filter((_, i) => !bulletsToRemove.has(i));

  zombies.forEach(z => {
    const centerX = z.x + z.width / 2;
    const centerY = z.y + z.height / 2;
    const radius = z.width / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2e2e2e';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(centerX - 7, centerY - 5, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 7, centerY - 5, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
  });

  animationId = requestAnimationFrame(draw);
}

function endGame() {
  gameRunning = false;
  if (spawnTimer) clearInterval(spawnTimer);
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  finalScoreEl.textContent = score;
  gameOverMessage.style.display = 'block';
  lastScores.unshift(score);
  document.getElementById('lastScores').innerHTML = `<h3>Resultados:</h3><ul>${lastScores.slice(0,5).map(s => `<li>${s}</li>`).join('')}</ul>`;
}

restartBtn.addEventListener('click', () => {
  initGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gameRunning = false;
    if (spawnTimer) clearInterval(spawnTimer);
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
  } else {
    if (player.life > 0 && !paused) {
      gameRunning = true;
      updateDifficulty();
      if (!animationId) animationId = requestAnimationFrame(draw);
    }
  }
});

initGame();