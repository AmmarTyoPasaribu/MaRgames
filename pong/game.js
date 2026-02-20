/* Pong — Game Engine + SFX */
(() => {
  'use strict';
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    hit()    { playTone(500, 0.06, 'triangle', 0.1); },
    wall()   { playTone(350, 0.05, 'triangle', 0.06); },
    score()  { playTone(880, 0.1, 'sine', 0.12); },
    lose()   { playTone(200, 0.2, 'square', 0.1); },
    win()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*120)); },
    over()   { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const overlay = $('overlay');

  const W = 420, H = 300;
  canvas.width = W; canvas.height = H;
  const WIN_SCORE = 7;

  let player, ai, ball, pScore, aiScore, running, paused = false, animId;
  const savedSound = localStorage.getItem('pong_sound');
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
    if (paused) { cancelAnimationFrame(animId); $('ov-emoji').textContent='⏸';$('ov-title').textContent='Paused';$('ov-msg').textContent='Press P to resume';overlay.classList.add('active'); }
    else { overlay.classList.remove('active'); tick(); }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('pong_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    const pw = 10, ph = 60;
    player = { x: 15, y: H/2 - ph/2, w: pw, h: ph };
    ai = { x: W - 25, y: H/2 - ph/2, w: pw, h: ph };
    resetBall();
    pScore = 0; aiScore = 0;
    $('p-score').textContent = 0; $('ai-score').textContent = 0;
  }

  function resetBall() {
    ball = { x: W/2, y: H/2, r: 6, dx: (Math.random()>0.5?1:-1)*4, dy: (Math.random()-0.5)*4 };
  }

  function draw() {
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0,0,W,H);
    // Center line
    ctx.setLineDash([6,6]); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([]);
    // Paddles
    ctx.fillStyle = '#14b8a6'; ctx.shadowColor = '#14b8a6'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(player.x, player.y, player.w, player.h, 4); ctx.fill();
    ctx.fillStyle = '#f43f5e'; ctx.shadowColor = '#f43f5e';
    ctx.beginPath(); ctx.roundRect(ai.x, ai.y, ai.w, ai.h, 4); ctx.fill();
    ctx.shadowBlur = 0;
    // Ball
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Score on canvas
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.font = 'bold 48px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pScore, W/4, 60); ctx.fillText(aiScore, 3*W/4, 60);
  }

  function update() {
    // AI movement
    const aiTarget = ball.y - ai.h/2;
    const aiSpeed = 3.2;
    if (ai.y < aiTarget) ai.y += Math.min(aiSpeed, aiTarget - ai.y);
    if (ai.y > aiTarget) ai.y -= Math.min(aiSpeed, ai.y - aiTarget);
    ai.y = Math.max(0, Math.min(H - ai.h, ai.y));

    // Ball movement
    ball.x += ball.dx; ball.y += ball.dy;

    // Wall bounce
    if (ball.y - ball.r < 0 || ball.y + ball.r > H) { ball.dy *= -1; SFX.wall(); }

    // Paddle collisions
    if (ball.dx < 0 && ball.x - ball.r <= player.x + player.w && ball.y >= player.y && ball.y <= player.y + player.h) {
      ball.dx = Math.abs(ball.dx) * 1.05;
      ball.dy += (ball.y - (player.y + player.h/2)) * 0.15;
      SFX.hit();
    }
    if (ball.dx > 0 && ball.x + ball.r >= ai.x && ball.y >= ai.y && ball.y <= ai.y + ai.h) {
      ball.dx = -Math.abs(ball.dx) * 1.05;
      ball.dy += (ball.y - (ai.y + ai.h/2)) * 0.15;
      SFX.hit();
    }

    // Scoring
    if (ball.x < 0) { aiScore++; $('ai-score').textContent = aiScore; SFX.lose(); resetBall(); checkWin(); }
    if (ball.x > W) { pScore++; $('p-score').textContent = pScore; SFX.score(); resetBall(); checkWin(); }
  }

  function checkWin() {
    if (pScore >= WIN_SCORE) { running = false; SFX.win(); $('ov-emoji').textContent='🎉'; $('ov-title').textContent='You Win!'; $('ov-msg').textContent=`${pScore} - ${aiScore}`; overlay.classList.add('active'); }
    else if (aiScore >= WIN_SCORE) { running = false; SFX.over(); $('ov-emoji').textContent='💀'; $('ov-title').textContent='AI Wins'; $('ov-msg').textContent=`${pScore} - ${aiScore}`; overlay.classList.add('active'); }
  }

  function tick() { if (!running || paused) return; update(); draw(); animId = requestAnimationFrame(tick); }

  function startGame() { overlay.classList.remove('active'); init(); draw(); running = true; paused = false; $('btn-pause').textContent='⏸'; tick(); }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    init(); draw();
    $('ov-emoji').textContent='🏓'; $('ov-title').textContent='Ready?'; $('ov-msg').textContent='First to 7 wins!';
    overlay.classList.add('active'); running = false;
  }

  // Controls
  let keys = {};
  document.addEventListener('keydown', e => {
    if (e.key==='Escape'||e.key==='p'||e.key==='P') { if(running) togglePause(); return; }
    keys[e.key] = true;
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  (function moveLoop() {
    if (running && !paused) {
      if (keys['ArrowUp'] && player.y > 0) player.y -= 6;
      if (keys['ArrowDown'] && player.y + player.h < H) player.y += 6;
    }
    requestAnimationFrame(moveLoop);
  })();

  canvas.addEventListener('mousemove', e => {
    if (!running || paused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    player.y = (e.clientY - rect.top) * scaleY - player.h/2;
    player.y = Math.max(0, Math.min(H - player.h, player.y));
  });

  canvas.addEventListener('touchmove', e => {
    if (!running || paused) return; e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    player.y = (e.touches[0].clientY - rect.top) * scaleY - player.h/2;
    player.y = Math.max(0, Math.min(H - player.h, player.y));
  }, {passive:false});

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', () => { SFX.click(); togglePause(); });
})();
