/* Fruit Ninja — Game Engine + SFX */
(() => {
  'use strict';
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    slice() { playTone(1200, 0.06, 'sawtooth', 0.06); setTimeout(()=>playTone(800,0.04,'sawtooth',0.04),30); },
    bomb()  { if(!soundEnabled)return; try{const c=getAudioCtx(),b=c.createBuffer(1,c.sampleRate*0.4,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.3,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.4);s.connect(g);g.connect(c.destination);s.start();}catch(e){} },
    miss()  { playTone(150, 0.15, 'square', 0.06); },
    over()  { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const overlay = $('overlay');

  const W = 360, H = 480;
  canvas.width = W; canvas.height = H;

  const FRUITS = [
    { emoji:'🍎', color:'#ef4444' }, { emoji:'🍊', color:'#f97316' },
    { emoji:'🍋', color:'#eab308' }, { emoji:'🍇', color:'#8b5cf6' },
    { emoji:'🍉', color:'#22c55e' }, { emoji:'🍑', color:'#fb923c' },
    { emoji:'🍓', color:'#e11d48' }, { emoji:'🥝', color:'#65a30d' },
  ];

  let fruits, slashTrail, score, best, lives, running, paused, animId, spawnTimer, frame;
  best = parseInt(localStorage.getItem('fruitninja_best') || '0');
  $('best').textContent = best;
  const savedSound = localStorage.getItem('fruitninja_sound');
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
    if (paused) { cancelAnimationFrame(animId); $('ov-emoji').textContent='⏸';$('ov-title').textContent='Paused';$('ov-msg').textContent='Press P/Esc to resume';overlay.classList.add('active'); }
    else { overlay.classList.remove('active'); tick(); }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('fruitninja_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    fruits = []; slashTrail = []; score = 0; lives = 3; frame = 0; spawnTimer = 0;
    $('score').textContent = 0; $('lives').textContent = '❤️❤️❤️';
  }

  function spawnFruit() {
    const isBomb = Math.random() < 0.15;
    const f = isBomb ? { emoji:'💣', color:'#333' } : FRUITS[Math.floor(Math.random()*FRUITS.length)];
    fruits.push({
      x: 30 + Math.random()*(W-60), y: H + 20,
      vx: (Math.random()-0.5)*3, vy: -(10 + Math.random()*4),
      r: 22, emoji: f.emoji, color: f.color,
      isBomb, sliced: false, rotation: Math.random()*6.28,
      rotSpeed: (Math.random()-0.5)*0.15
    });
  }

  function draw() {
    ctx.fillStyle = '#08080f'; ctx.fillRect(0,0,W,H);
    // Slash trail
    if (slashTrail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(slashTrail[0].x, slashTrail[0].y);
      slashTrail.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(slashTrail[0].x, slashTrail[0].y);
      slashTrail.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
    // Fruits
    fruits.forEach(f => {
      if (f.sliced) return;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rotation);
      ctx.font = `${f.r*2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.emoji, 0, 0);
      // Glow
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0,0,f.r*0.6,0,Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    // Slice particles
    fruits.forEach(f => {
      if (!f.sliced || !f.particles) return;
      f.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });
  }

  function update() {
    frame++;
    // Spawn
    spawnTimer++;
    const spawnRate = Math.max(25, 60 - Math.floor(score/5)*3);
    if (spawnTimer >= spawnRate) { spawnTimer = 0; spawnFruit(); if (Math.random()<0.4) spawnFruit(); }

    // Physics
    fruits.forEach(f => {
      if (f.sliced) {
        if (f.particles) f.particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=0.03; });
        return;
      }
      f.x += f.vx; f.y += f.vy; f.vy += 0.25; f.rotation += f.rotSpeed;
    });

    // Miss check
    fruits = fruits.filter(f => {
      if (f.sliced) return f.particles && f.particles.some(p => p.life > 0);
      if (f.y > H + 40) {
        if (!f.isBomb) { lives--; $('lives').textContent = lives>0?'❤️'.repeat(lives):'💀'; SFX.miss(); if(lives<=0)gameOver(); }
        return false;
      }
      return true;
    });

    // Slash trail fade
    slashTrail = slashTrail.filter(p => Date.now() - p.t < 150);
    draw();
  }

  function checkSlice(x, y) {
    fruits.forEach(f => {
      if (f.sliced) return;
      const dx = x - f.x, dy = y - f.y;
      if (dx*dx + dy*dy < f.r*f.r*1.5) {
        f.sliced = true;
        if (f.isBomb) { SFX.bomb(); lives--; $('lives').textContent = lives>0?'❤️'.repeat(lives):'💀'; if(lives<=0)gameOver(); }
        else { SFX.slice(); score++; $('score').textContent = score; }
        // Particles
        f.particles = [];
        for (let i = 0; i < 8; i++) {
          f.particles.push({ x: f.x, y: f.y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6-2, size:Math.random()*4+2, life:1 });
        }
      }
    });
  }

  let isSlashing = false;
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left)*sx, y: (clientY - rect.top)*sy };
  }

  canvas.addEventListener('mousedown', e => { if(!running||paused)return; isSlashing=true; const p=getCanvasPos(e); slashTrail=[{...p,t:Date.now()}]; checkSlice(p.x,p.y); });
  canvas.addEventListener('mousemove', e => { if(!isSlashing||!running||paused)return; const p=getCanvasPos(e); slashTrail.push({...p,t:Date.now()}); checkSlice(p.x,p.y); });
  canvas.addEventListener('mouseup', () => { isSlashing=false; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); if(!running||paused)return; isSlashing=true; const p=getCanvasPos(e); slashTrail=[{...p,t:Date.now()}]; checkSlice(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if(!isSlashing||!running||paused)return; const p=getCanvasPos(e); slashTrail.push({...p,t:Date.now()}); checkSlice(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchend', () => { isSlashing=false; });

  function tick() { if(!running||paused)return; update(); animId=requestAnimationFrame(tick); }

  function gameOver() {
    running=false; cancelAnimationFrame(animId);
    if(score>best){best=score;$('best').textContent=best;localStorage.setItem('fruitninja_best',String(best));}
    SFX.over();
    $('ov-emoji').textContent='💀'; $('ov-title').textContent='Game Over';
    $('ov-msg').textContent=`Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame(){ overlay.classList.remove('active'); init(); draw(); running=true; paused=false; $('btn-pause').textContent='⏸'; tick(); }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    init(); draw();
    $('ov-emoji').textContent='🍉'; $('ov-title').textContent='Ready?'; $('ov-msg').textContent='Swipe to slice fruits!';
    overlay.classList.add('active'); running=false;
  }

  document.addEventListener('keydown', e => {
    if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(running)togglePause();return;}
  });

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', ()=>{SFX.click();showScreen('home');});
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', ()=>{SFX.click();togglePause();});
})();
