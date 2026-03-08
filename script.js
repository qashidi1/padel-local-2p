const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restartBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 460;
const NET_X = WIDTH / 2;
const NET_WIDTH = 12;
const NET_HEIGHT = 120;
const WIN_SCORE = 7;

// Physics/update
const FIXED_TIMESTEP = 1000 / 120; // 120 Hz
const GRAVITY = 0.32;
const PLAYER_MOVE_SPEED = 5.4; // responsif
const PLAYER_JUMP_FORCE = -8.2;
const MAX_FALL_SPEED = 12;

// Ball speed levels
const BALL_SPEED_LEVELS = {
  1: { label: "Very Slow", baseVX: 1.2, bounceX: 1.3, bounceBoost: 0.25, bounceY: -2.0 },
  2: { label: "Slow",      baseVX: 1.8, bounceX: 1.8, bounceBoost: 0.35, bounceY: -2.6 },
  3: { label: "Medium",    baseVX: 2.5, bounceX: 2.4, bounceBoost: 0.50, bounceY: -3.3 },
  4: { label: "Fast",      baseVX: 3.2, bounceX: 3.0, bounceBoost: 0.65, bounceY: -4.0 },
  5: { label: "Very Fast", baseVX: 4.0, bounceX: 3.8, bounceBoost: 0.80, bounceY: -4.8 }
};

let ballSpeedLevel = 2;

const keys = {};
let leftScore = 0;
let rightScore = 0;
let gameOver = false;

const playerLeft = {
  x: 140,
  y: GROUND_Y - 80,
  w: 28,
  h: 80,
  vy: 0,
  onGround: true,
  color: "#f59e0b"
};

const playerRight = {
  x: WIDTH - 168,
  y: GROUND_Y - 80,
  w: 28,
  h: 80,
  vy: 0,
  onGround: true,
  color: "#8b5cf6"
};

const ball = {
  x: WIDTH / 2,
  y: 140,
  r: 14,
  vx: BALL_SPEED_LEVELS[ballSpeedLevel].baseVX,
  vy: 0,
  color: "#f97316"
};

function getBallConfig() {
  return BALL_SPEED_LEVELS[ballSpeedLevel];
}

function resetBall(direction = 1) {
  const cfg = getBallConfig();

  ball.x = WIDTH / 2;
  ball.y = 140;
  ball.vx = cfg.baseVX * direction;
  ball.vy = 0;

  playerLeft.x = 140;
  playerLeft.y = GROUND_Y - playerLeft.h;
  playerLeft.vy = 0;
  playerLeft.onGround = true;

  playerRight.x = WIDTH - 168;
  playerRight.y = GROUND_Y - playerRight.h;
  playerRight.vy = 0;
  playerRight.onGround = true;
}

function restartGame() {
  leftScore = 0;
  rightScore = 0;
  gameOver = false;
  updateScore();
  messageEl.textContent = "";
  resetBall(Math.random() < 0.5 ? -1 : 1);
}

function updateScore() {
  leftScoreEl.textContent = leftScore;
  rightScoreEl.textContent = rightScore;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleRectCollision(ballObj, rect) {
  const closestX = clamp(ballObj.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ballObj.y, rect.y, rect.y + rect.h);
  const dx = ballObj.x - closestX;
  const dy = ballObj.y - closestY;
  return dx * dx + dy * dy < ballObj.r * ballObj.r;
}

function updatePlayer(player, controls, side) {
  if (gameOver) return;

  if (keys[controls.left]) player.x -= PLAYER_MOVE_SPEED;
  if (keys[controls.right]) player.x += PLAYER_MOVE_SPEED;

  if (keys[controls.jump] && player.onGround) {
    player.vy = PLAYER_JUMP_FORCE;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);
  player.y += player.vy;

  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  if (side === "left") {
    player.x = clamp(player.x, 20, NET_X - NET_WIDTH / 2 - player.w - 10);
  } else {
    player.x = clamp(player.x, NET_X + NET_WIDTH / 2 + 10, WIDTH - player.w - 20);
  }
}

function bounceBallFromPlayer(player, side) {
  const rect = { x: player.x, y: player.y, w: player.w, h: player.h };

  if (!circleRectCollision(ball, rect)) return;

  const cfg = getBallConfig();
  const centerX = player.x + player.w / 2;
  const offset = (ball.x - centerX) / (player.w / 2);

  if (side === "left") {
    ball.x = player.x + player.w + ball.r + 1;
    ball.vx = Math.abs(cfg.bounceX + offset * cfg.bounceBoost);
  } else {
    ball.x = player.x - ball.r - 1;
    ball.vx = -Math.abs(cfg.bounceX + offset * cfg.bounceBoost);
  }

  ball.vy = Math.min(cfg.bounceY, ball.vy - 0.35);
}

function updateBall() {
  if (gameOver) return;

  ball.vy += GRAVITY;
  ball.vy = Math.min(ball.vy, MAX_FALL_SPEED);
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r <= 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  }

  if (ball.x + ball.r >= WIDTH) {
    ball.x = WIDTH - ball.r;
    ball.vx *= -1;
  }

  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -0.95;
  }

  const netRect = {
    x: NET_X - NET_WIDTH / 2,
    y: GROUND_Y - NET_HEIGHT,
    w: NET_WIDTH,
    h: NET_HEIGHT
  };

  if (circleRectCollision(ball, netRect)) {
    if (ball.x < NET_X) {
      ball.x = netRect.x - ball.r - 1;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = netRect.x + netRect.w + ball.r + 1;
      ball.vx = Math.abs(ball.vx);
    }
    ball.vy *= 0.96;
  }

  bounceBallFromPlayer(playerLeft, "left");
  bounceBallFromPlayer(playerRight, "right");

  if (ball.y + ball.r >= GROUND_Y) {
    if (ball.x < NET_X) {
      rightScore += 1;
      updateScore();
      checkWinner();
      if (!gameOver) resetBall(1);
    } else {
      leftScore += 1;
      updateScore();
      checkWinner();
      if (!gameOver) resetBall(-1);
    }
  }
}

function checkWinner() {
  if (leftScore >= WIN_SCORE) {
    gameOver = true;
    messageEl.textContent = `Left Player Menang! | Ball Speed: ${ballSpeedLevel} (${getBallConfig().label})`;
  } else if (rightScore >= WIN_SCORE) {
    gameOver = true;
    messageEl.textContent = `Right Player Menang! | Ball Speed: ${ballSpeedLevel} (${getBallConfig().label})`;
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Kambami Games", WIDTH / 2, 90);
  ctx.restore();

  ctx.fillStyle = "#caa472";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(NET_X - NET_WIDTH / 2, GROUND_Y - NET_HEIGHT, NET_WIDTH, NET_HEIGHT);

  ctx.fillStyle = "#ef4444";
  ctx.fillRect(NET_X - 30, GROUND_Y - NET_HEIGHT - 8, 60, 8);

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(NET_X, 0);
  ctx.lineTo(NET_X, GROUND_Y);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Ball Speed Level: ${ballSpeedLevel} (${getBallConfig().label})`, 20, 30);
  ctx.fillText("Press 1-5 to change ball speed", 20, 55);
}

function drawPlayer(player) {
  const isLeft = player === playerLeft;
  const bodyColor = isLeft ? "#f59e0b" : "#8b5cf6";
  const earColor = isLeft ? "#fcd34d" : "#c4b5fd";
  const faceX = player.x + player.w / 2;
  const faceY = player.y + 24;

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(player.x - 8, player.y + 18, 44, 58, 14);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(faceX, faceY, 20, 0, Math.PI * 2);
  ctx.fill();

  if (isLeft) {
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.moveTo(faceX - 14, faceY - 10);
    ctx.lineTo(faceX - 6, faceY - 28);
    ctx.lineTo(faceX - 1, faceY - 8);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(faceX + 14, faceY - 10);
    ctx.lineTo(faceX + 6, faceY - 28);
    ctx.lineTo(faceX + 1, faceY - 8);
    ctx.fill();
  } else {
    ctx.fillStyle = earColor;
    ctx.beginPath();
    ctx.arc(faceX - 12, faceY - 16, 7, 0, Math.PI * 2);
    ctx.arc(faceX + 12, faceY - 16, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(faceX - 7, faceY - 2, 2.5, 0, Math.PI * 2);
  ctx.arc(faceX + 7, faceY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(faceX, faceY + 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(faceX, faceY + 7, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.ellipse(player.x + 6, player.y + 76, 6, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(player.x + 22, player.y + 76, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall() {
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawWinnerOverlay() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(messageEl.textContent, WIDTH / 2, 120);
}

function render() {
  drawBackground();
  drawPlayer(playerLeft);
  drawPlayer(playerRight);
  drawBall();
  drawWinnerOverlay();

  if (!gameOver) {
    messageEl.textContent = `Ball Speed: ${ballSpeedLevel} (${getBallConfig().label}) | Tombol 1-5 untuk ganti speed bola`;
  }
}

let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let delta = timestamp - lastTime;
  lastTime = timestamp;

  if (delta > 100) delta = 100;
  accumulator += delta;

  while (accumulator >= FIXED_TIMESTEP) {
    updatePlayer(playerLeft, { left: "a", right: "d", jump: "w" }, "left");
    updatePlayer(playerRight, { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" }, "right");
    updateBall();
    accumulator -= FIXED_TIMESTEP;
  }

  render();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (["1", "2", "3", "4", "5"].includes(e.key)) {
    ballSpeedLevel = Number(e.key);
    messageEl.textContent = `Ball speed diubah ke level ${ballSpeedLevel} (${getBallConfig().label})`;
    if (!gameOver) {
      const dir = ball.vx >= 0 ? 1 : -1;
      ball.vx = Math.abs(getBallConfig().baseVX) * dir;
    }
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

restartBtn.addEventListener("click", restartGame);

updateScore();
resetBall();
requestAnimationFrame(gameLoop);
