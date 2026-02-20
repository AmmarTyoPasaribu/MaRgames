/* Space Invaders — Game Engine + SFX */
(() => {
  'use strict';
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    shoot()  { playTone(900, 0.08, 'square', 0.06); setTimeout(()=>playTone(700,0.05,'square',0.04),30); },
    hit()    { playTone(300, 0.1, 'sawtooth', 0.1); setTimeout(()=>playTone(200,0.08,'sawtooth',0.08),50); },
    die()    { if(!soundEnabled)return; try{const c=getAudioCtx(),b=c.createBuffer(1,c.sampleRate*0.3,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.2,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.3);s.connect(g);g.connect(c.destination);s.start();}catch(e){} },
    wave()   { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,0.15,'sine',0.1),i*100)); },
    over()   { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const overlay = $('overlay');

  const W = 360, H = 420;
  canvas.width = W; canvas.height = H;

  let ship, bullets, aliens, alienBullets, score, best, lives, wave, running, paused, animId, moveDir, moveDown, moveTimer;
  best = parseInt(localStorage.getItem('invaders_best') || '0');
  $('best').textContent = best;
  const savedSound = localStorage.getItem('invaders_sound');
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
    if (paused) { cancelAnimationFrame(animId); $('ov-emoji').textContent='⏸';$('ov-title').textContent='Paused';$('ov-msg').textContent='Press P or Esc to resume';overlay.classList.add('active'); }
    else { overlay.classList.remove('active'); tick(); }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('invaders_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function createAliens() {
    aliens = [];
    const colors = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7'];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        aliens.push({ x: 30 + col*40, y: 40 + row*30, w: 28, h: 20, alive: true, color: colors[row] });
      }
    }
    moveDir = 1; moveDown = false; moveTimer = 0;
  }

  function init() {
    ship = { x: W/2-15, y: H-40, w: 30, h: 16 };
    bullets = []; alienBullets = [];
    score = 0; lives = 3; wave = 1;
    $('score').textContent = 0; $('lives').textContent = '❤️'.repeat(lives);
    createAliens();
  }

  function draw() {
    ctx.fillStyle = '#06060e'; ctx.fillRect(0,0,W,H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 40; i++) { const sx=(i*37)%W, sy=(i*53+moveTimer)%H; ctx.fillRect(sx,sy,1.2,1.2); }
    // Ship
    ctx.fillStyle = '#22d3ee'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(ship.x+ship.w/2, ship.y);
    ctx.lineTo(ship.x+ship.w, ship.y+ship.h);
    ctx.lineTo(ship.x, ship.y+ship.h);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // Aliens
    aliens.forEach(a => {
      if (!a.alive) return;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.roundRect(a.x, a.y, a.w, a.h, 4); ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(a.x+6, a.y+6, 4, 4);
      ctx.fillRect(a.x+18, a.y+6, 4, 4);
    });
    // Bullets
    ctx.fillStyle = '#22d3ee';
    bullets.forEach(b => { ctx.fillRect(b.x-1, b.y, 3, 8); });
    ctx.fillStyle = '#ef4444';
    alienBullets.forEach(b => { ctx.fillRect(b.x-1, b.y, 3, 8); });
  }

  function update() {
    moveTimer++;
    // Ship movement via keys
    if (keys['ArrowLeft'] && ship.x > 0) ship.x -= 4;
    if (keys['ArrowRight'] && ship.x + ship.w < W) ship.x += 4;

    // Bullets
    bullets.forEach(b => b.y -= 6);
    bullets = bullets.filter(b => b.y > -10);
    alienBullets.forEach(b => b.y += 3);
    alienBullets = alienBullets.filter(b => b.y < H+10);

    // Alien movement
    if (moveTimer % Math.max(4, 20 - wave*2) === 0) {
      let hitEdge = false;
      aliens.forEach(a => { if (a.alive && ((a.x+a.w+moveDir*6 > W-5) || (a.x+moveDir*6 < 5))) hitEdge = true; });
      if (hitEdge) { moveDir *= -1; aliens.forEach(a => { if(a.alive) a.y += 10; }); }
      else aliens.forEach(a => { if(a.alive) a.x += moveDir * 6; });
    }

    // Alien shooting
    if (moveTimer % 60 === 0) {
      const alive = aliens.filter(a => a.alive);
      if (alive.length) { const a = alive[Math.floor(Math.random()*alive.length)]; alienBullets.push({x:a.x+a.w/2,y:a.y+a.h}); }
    }

    // Bullet-alien collision
    bullets.forEach(b => {
      aliens.forEach(a => {
        if (a.alive && b.x>a.x && b.x<a.x+a.w && b.y>a.y && b.y<a.y+a.h) {
          a.alive = false; b.y = -99; score += 10;
          $('score').textContent = score; SFX.hit();
        }
      });
    });

    // Alien bullet-ship collision
    alienBullets.forEach(b => {
      if (b.x>ship.x && b.x<ship.x+ship.w && b.y>ship.y && b.y<ship.y+ship.h) {
        b.y = H+99; lives--;
        $('lives').textContent = lives > 0 ? '❤️'.repeat(lives) : '💀';
        SFX.die();
        if (lives <= 0) gameOver();
      }
    });

    // Aliens reach bottom
    if (aliens.some(a => a.alive && a.y + a.h >= ship.y)) { lives = 0; $('lives').textContent = '💀'; gameOver(); return; }

    // Wave complete
    if (aliens.every(a => !a.alive)) { wave++; SFX.wave(); createAliens(); }

    draw();
  }

  let keys = {};
  function tick() { if (!running || paused) return; update(); animId = requestAnimationFrame(tick); }

  function gameOver() {
    running = false; cancelAnimationFrame(animId);
    if (score > best) { best = score; $('best').textContent = best; localStorage.setItem('invaders_best', String(best)); }
    SFX.over();
    $('ov-emoji').textContent = '💀'; $('ov-title').textContent = 'Game Over';
    $('ov-msg').textContent = `Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame() { overlay.classList.remove('active'); init(); draw(); running = true; paused = false; $('btn-pause').textContent='⏸'; tick(); }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    init(); draw();
    $('ov-emoji').textContent='👾'; $('ov-title').textContent='Ready?'; $('ov-msg').textContent='Destroy all invaders!';
    overlay.classList.add('active'); running = false;
  }

  document.addEventListener('keydown', e => {
    if (e.key==='Escape'||e.key==='p'||e.key==='P') { if(running) togglePause(); return; }
    if (paused) return;
    keys[e.key] = true;
    if (e.code === 'Space') { e.preventDefault(); if (!running) startGame(); else { bullets.push({x:ship.x+ship.w/2, y:ship.y}); SFX.shoot(); }}
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // Touch controls
  let touchX = null;
  canvas.addEventListener('touchstart', e => { e.preventDefault(); touchX = e.touches[0].clientX; if(!running&&!paused) startGame(); else { bullets.push({x:ship.x+ship.w/2,y:ship.y});SFX.shoot(); }}, {passive:false});
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if(!running||paused) return; const dx=e.touches[0].clientX-touchX; touchX=e.touches[0].clientX; ship.x=Math.max(0,Math.min(W-ship.w,ship.x+dx)); }, {passive:false});

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', () => { SFX.click(); togglePause(); });
})();
