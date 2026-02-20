/* Breakout — Game Engine + Home Screen + SFX */
(() => {
  'use strict';

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }

  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    paddle() { playTone(500, 0.06, 'triangle', 0.1); },
    brick()  { playTone(800+Math.random()*400, 0.08, 'sine', 0.1); },
    wall()   { playTone(350, 0.05, 'triangle', 0.06); },
    lose()   { playTone(200, 0.3, 'square', 0.1); },
    win()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*120)); },
    over()   { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const scoreEl = $('score'), livesEl = $('lives'), bestEl = $('best');
  const overlay = $('overlay');

  const W = 420, H = 560;
  canvas.width = W; canvas.height = H;

  const BRICK_ROWS = 6, BRICK_COLS = 8, BRICK_H = 18, BRICK_PAD = 4;
  const BRICK_TOP = 50;
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'];

  let paddle, ball, bricks, score, lives, best, running, paused = false, animId;
  best = parseInt(localStorage.getItem('breakout_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('breakout_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { running = false; paused = false; cancelAnimationFrame(animId); }
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    $('btn-pause').textContent = paused ? '▶' : '⏸';
    if (paused) {
      cancelAnimationFrame(animId);
      $('ov-emoji').textContent = '⏸'; $('ov-title').textContent = 'Paused';
      $('ov-msg').textContent = 'Press P or Esc to resume';
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
      tick();
    }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('breakout_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    const pw = 80, ph = 12;
    paddle = { x: W/2 - pw/2, y: H - 30, w: pw, h: ph };
    ball = { x: W/2, y: paddle.y - 10, r: 7, dx: 3.5, dy: -3.5 };
    score = 0; lives = 3;
    scoreEl.textContent = 0; livesEl.textContent = 3;

    bricks = [];
    const bw = (W - (BRICK_COLS+1)*BRICK_PAD) / BRICK_COLS;
    for (let r=0;r<BRICK_ROWS;r++) for (let c=0;c<BRICK_COLS;c++) {
      bricks.push({
        x: BRICK_PAD + c*(bw+BRICK_PAD),
        y: BRICK_TOP + r*(BRICK_H+BRICK_PAD),
        w: bw, h: BRICK_H,
        color: COLORS[r % COLORS.length],
        alive: true,
        points: (BRICK_ROWS - r) * 10,
      });
    }
  }

  function draw() {
    ctx.fillStyle='#0a0a14'; ctx.fillRect(0,0,W,H);

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(b.x+2, b.y, b.w-4, 3);
    });
    ctx.shadowBlur=0;

    // Paddle
    const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x+paddle.w, paddle.y);
    grad.addColorStop(0,'#f43f5e'); grad.addColorStop(1,'#fb923c');
    ctx.fillStyle = grad; ctx.shadowColor='#f43f5e';ctx.shadowBlur=10;
    ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
    ctx.shadowBlur=0;

    // Ball
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }

  function update() {
    ball.x += ball.dx; ball.y += ball.dy;

    // Wall collisions
    if (ball.x - ball.r < 0 || ball.x + ball.r > W) { ball.dx *= -1; SFX.wall(); }
    if (ball.y - ball.r < 0) { ball.dy *= -1; SFX.wall(); }

    // Paddle collision
    if (ball.dy > 0 && ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 4 &&
        ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
      ball.dy = -Math.abs(ball.dy);
      const hit = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
      ball.dx = hit * 5;
      SFX.paddle();
    }

    // Brick collisions
    bricks.forEach(b => {
      if (!b.alive) return;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.alive = false; ball.dy *= -1;
        score += b.points; scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('breakout_best',String(best)); }
        SFX.brick();
      }
    });

    // Check win
    if (bricks.every(b => !b.alive)) {
      running = false; SFX.win();
      $('ov-emoji').textContent = '🎉'; $('ov-title').textContent = 'You Win!';
      $('ov-msg').textContent = `Score: ${score}`;
      overlay.classList.add('active');
      return;
    }

    // Ball lost
    if (ball.y + ball.r > H) {
      lives--; livesEl.textContent = lives; SFX.lose();
      if (lives <= 0) {
        running = false; SFX.over();
        $('ov-emoji').textContent = '💀'; $('ov-title').textContent = 'Game Over';
        $('ov-msg').textContent = `Score: ${score} | Best: ${best}`;
        overlay.classList.add('active');
        return;
      }
      ball.x = W/2; ball.y = paddle.y - 10; ball.dx = 3.5; ball.dy = -3.5;
    }
  }

  function tick() {
    if (!running || paused) return;
    update(); draw();
    animId = requestAnimationFrame(tick);
  }

  function startGame() {
    overlay.classList.remove('active');
    init(); draw(); running = true; paused = false;
    $('btn-pause').textContent = '⏸';
    tick();
  }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    init(); draw();
    $('ov-emoji').textContent = '🏓'; $('ov-title').textContent = 'Ready?';
    $('ov-msg').textContent = 'Click or tap to start!';
    overlay.classList.add('active'); running = false;
  }

  // Controls
  let keys = {};
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if(running) togglePause(); return; }
    keys[e.key]=true;
  });
  document.addEventListener('keyup', e => { keys[e.key]=false; });

  (function moveLoop() {
    if (running && !paused) {
      if (keys['ArrowLeft'] && paddle.x > 0) paddle.x -= 7;
      if (keys['ArrowRight'] && paddle.x + paddle.w < W) paddle.x += 7;
    }
    requestAnimationFrame(moveLoop);
  })();

  canvas.addEventListener('mousemove', e => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    paddle.x = (e.clientX - rect.left) * scaleX - paddle.w/2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  });

  canvas.addEventListener('touchmove', e => {
    if (!running) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    paddle.x = (e.touches[0].clientX - rect.left) * scaleX - paddle.w/2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
  }, {passive:false});

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', ()=>{ SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', ()=>{ SFX.click(); togglePause(); });
})();
