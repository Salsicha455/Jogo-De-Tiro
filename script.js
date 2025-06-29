const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const lifeEl = document.getElementById('life');
const scoreEl = document.getElementById('score');
const difficultyEl = document.getElementById('difficulty');
const gameOverMessage = document.getElementById('gameOverMessage');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

let returnMenuBtn = document.createElement('button');
returnMenuBtn.textContent = 'Voltar ao Menu';
returnMenuBtn.id = 'returnMenuBtn';
returnMenuBtn.style.marginTop = '10px';
gameOverMessage.appendChild(returnMenuBtn);

const MAX_DIFFICULTY = 10;
const BASE_MAX_ENEMIES = 5;
const ENEMIES_PER_DIFFICULTY = 2;
const SCORE_PER_DIFFICULTY = 200;
const POINTS_PER_ENEMY = 100;

const POWER_UP_TYPES = {
  SLOW_ENEMIES: 'slow_enemies',
};

const POWER_UP_DURATION_MS = 3000;
const POWER_UP_DROP_CHANCE = 0.2;

let gameRunning = false;
let playerName = '';
let score = 0;
let life = 3;
let difficulty = 0;
let bullets = [];
let enemies = [];
let powerUps = [];
let keys = {};
let spawnTimer;
let animationId;

const shootSound = new Audio('shoot.mp3');
const hitSound = new Audio('hit.mp3');
const loseSound = new Audio('lose.mp3');

let lastScores = JSON.parse(localStorage.getItem('scores') || '[]');

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

returnMenuBtn.onclick = () => {
  gameRunning = false;
  if (spawnTimer) clearInterval(spawnTimer);
  if (animationId) cancelAnimationFrame(animationId);

  gameOverMessage.style.display = 'none';
  startScreen.style.display = 'flex';
};

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

let slowEnemiesActive = false;
let slowEnemiesTimeout;

function activatePowerUp(type) {
  if (type === POWER_UP_TYPES.SLOW_ENEMIES) {
    slowEnemiesActive = true;
    if (slowEnemiesTimeout) clearTimeout(slowEnemiesTimeout);
    slowEnemiesTimeout = setTimeout(() => {
      slowEnemiesActive = false;
    }, POWER_UP_DURATION_MS);
  }
}

function initGame() {
  gameRunning = true;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  life = 3;
  score = 0;
  difficulty = 0;
  bullets = [];
  enemies = [];
  powerUps = [];
  keys = {};

  lifeEl.textContent = life;
  scoreEl.textContent = score;
  difficultyEl.textContent = difficulty;

  player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 4
  };

  gameOverMessage.style.display = 'none';

  canvas.addEventListener('click', shootBullet);

  spawnTimer = setInterval(spawnEnemy, 500);
  loop();
}

function shootBullet(e) {
  if (!gameRunning) return;

  const angle = Math.atan2(
    e.clientY - player.y,
    e.clientX - player.x
  );
  bullets.push({
    x: player.x,
    y: player.y,
    dx: Math.cos(angle) * 10,
    dy: Math.sin(angle) * 10
  });

  shootSound.currentTime = 0;
  shootSound.play();
}

function spawnEnemy() {
  const maxEnemies = BASE_MAX_ENEMIES + difficulty * ENEMIES_PER_DIFFICULTY;
  if (enemies.length >= maxEnemies) return;

  const size = 20;
  const side = Math.floor(Math.random() * 4);
  let x, y;

  if (side === 0) { x = 0; y = Math.random() * canvas.height; }
  if (side === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  if (side === 2) { x = Math.random() * canvas.width; y = 0; }
  if (side === 3) { x = Math.random() * canvas.width; y = canvas.height; }

  let baseSpeed = Math.min(1 + difficulty * 0.3, player.speed * 2);

  enemies.push({ x, y, size, speed: baseSpeed });
}

function loop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (keys['w']) player.y -= player.speed;
  if (keys['s']) player.y += player.speed;
  if (keys['a']) player.x -= player.speed;
  if (keys['d']) player.x += player.speed;

  // Desenha jogador com brilho verde
  ctx.shadowColor = 'lime';
  ctx.shadowBlur = 15;
  ctx.fillStyle = 'lime';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Atualiza e desenha balas (de trás pra frente)
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
    }
  }

  // Atualiza e desenha inimigos com brilho vermelho e velocidade reduzida se power ativo
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    const angle = Math.atan2(player.y - e.y, player.x - e.x);

    let currentSpeed = e.speed;
    if (slowEnemiesActive) currentSpeed *= 0.2; // reduz 80% se power ativo

    e.x += Math.cos(angle) * currentSpeed;
    e.y += Math.sin(angle) * currentSpeed;

    ctx.shadowColor = 'red';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Colisão inimigo-jogador
    const dxPlayer = player.x - e.x;
    const dyPlayer = player.y - e.y;
    const distPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
    if (distPlayer < player.radius + e.size) {
      life--;
      lifeEl.textContent = life;
      enemies.splice(ei, 1);
      if (life <= 0) {
        loseSound.play();
        endGame();
        return;
      }
      continue;
    }

    // Colisão bala-inimigo
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < e.size + 5) {
        score += POINTS_PER_ENEMY;
        difficulty = Math.min(MAX_DIFFICULTY, Math.floor(score / SCORE_PER_DIFFICULTY));
        scoreEl.textContent = score;
        difficultyEl.textContent = difficulty;
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        hitSound.play();

        if (Math.random() < POWER_UP_DROP_CHANCE) {
          powerUps.push({
            x: e.x,
            y: e.y,
            size: 15,
            type: POWER_UP_TYPES.SLOW_ENEMIES,
          });
        }

        break;
      }
    }
  }

  // Desenha power-ups com pulsação azul
  const pulse = 1 + 0.15 * Math.sin(Date.now() / 200);
  powerUps.forEach((pu) => {
    ctx.shadowColor = 'blue';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Colisão jogador-power-up
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i];
    const dx = player.x - pu.x;
    const dy = player.y - pu.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < player.radius + pu.size) {
      activatePowerUp(pu.type);
      powerUps.splice(i, 1);
    }
  }

  animationId = requestAnimationFrame(loop);
}

function endGame() {
  gameRunning = false;
  if (spawnTimer) clearInterval(spawnTimer);
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  finalScoreEl.textContent = score;
  gameOverMessage.style.display = 'block';

  lastScores.unshift({ name: playerName, score });
  lastScores = lastScores.slice(0, 10);

  localStorage.setItem('scores', JSON.stringify(lastScores));

  const previousScoresEl = document.getElementById('previousScores');
  if (previousScoresEl) {
    previousScoresEl.innerHTML = lastScores.map(s => `<li>${s.name}: ${s.score}</li>`).join('');
  }
}

restartBtn.onclick = () => {
  initGame();
};
