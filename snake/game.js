/* Snake — Game Engine + Home Screen + SFX */
(() => {
  'use strict';

  // ─── PARTICLES ───────────────────────────
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div'); p.classList.add('particle');
    const s = Math.random()*4+2;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`;
    pc.appendChild(p);
  }

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(freq, dur, type='sine', vol=0.15) {
    if (!soundEnabled) return;
    try { const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+dur); } catch(e){}
  }
  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    eat()   { playTone(880, 0.1, 'sine', 0.12); setTimeout(()=>playTone(1100,0.08,'sine',0.1),60); },
    turn()  { playTone(500, 0.05, 'triangle', 0.06); },
    die()   {
      if(!soundEnabled)return;
      try{const c=getAudioCtx(),b=c.createBuffer(1,c.sampleRate*0.3,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.2,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.3);s.connect(g);g.connect(c.destination);s.start();}catch(e){}
    },
  };

  // ─── DOM ─────────────────────────────────
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const scoreEl = $('score'), bestEl = $('best');
  const overlay = $('overlay'), overlayEmoji = $('overlay-emoji'), overlayTitle = $('overlay-title'), overlayMsg = $('overlay-msg');

  // ─── STATE ───────────────────────────────
  const GRID = 20;
  let CELL, snake, dir, nextDir, food, score, best, gameLoop, speed, running, paused = false;
  best = parseInt(localStorage.getItem('snake_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('snake_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { running = false; paused = false; clearInterval(gameLoop); }
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    $('btn-pause').textContent = paused ? '▶' : '⏸';
    if (paused) {
      clearInterval(gameLoop);
      overlayEmoji.textContent = '⏸'; overlayTitle.textContent = 'Paused';
      overlayMsg.textContent = 'Press P or Esc to resume';
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
      gameLoop = setInterval(tick, speed);
    }
  }

  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('snake_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function resize() {
    const size = Math.min(canvas.parentElement.clientWidth, 400);
    canvas.width = size; canvas.height = size; CELL = size / GRID;
  }

  function init() {
    resize();
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir = {x:1,y:0}; nextDir = {x:1,y:0};
    score = 0; speed = 140; scoreEl.textContent = 0;
    placeFood();
  }

  function placeFood() {
    do { food = {x:Math.floor(Math.random()*GRID),y:Math.floor(Math.random()*GRID)}; }
    while (snake.some(s=>s.x===food.x&&s.y===food.y));
  }

  function draw() {
    ctx.fillStyle='#0a0a16'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=0.5;
    for(let i=0;i<=GRID;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,canvas.height);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*CELL);ctx.lineTo(canvas.width,i*CELL);ctx.stroke();}

    // Food
    ctx.fillStyle='#ef4444';ctx.shadowColor='#ef4444';ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(food.x*CELL+CELL/2,food.y*CELL+CELL/2,CELL/2.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;

    // Snake
    snake.forEach((seg,i)=>{
      const ratio=1-i/snake.length,g=Math.floor(180+ratio*75);
      ctx.fillStyle=`rgb(16,${g},100)`;ctx.shadowColor='#22c55e';ctx.shadowBlur=i===0?10:4;
      const pad=i===0?1:2;
      ctx.beginPath();ctx.roundRect(seg.x*CELL+pad,seg.y*CELL+pad,CELL-pad*2,CELL-pad*2,4);ctx.fill();
    });
    ctx.shadowBlur=0;

    // Eyes
    const h=snake[0]; ctx.fillStyle='#fff';
    const ex=h.x*CELL+CELL/2+dir.x*3,ey=h.y*CELL+CELL/2+dir.y*3;
    ctx.beginPath();ctx.arc(ex-2,ey-2,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(ex+2,ey+2,2,0,Math.PI*2);ctx.fill();
  }

  function update() {
    dir = nextDir;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    if(head.x<0||head.x>=GRID||head.y<0||head.y>=GRID) return gameOverFn();
    if(snake.some(s=>s.x===head.x&&s.y===head.y)) return gameOverFn();
    snake.unshift(head);
    if(head.x===food.x&&head.y===food.y){
      score++;scoreEl.textContent=score;
      if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('snake_best',String(best));}
      SFX.eat(); placeFood();
      if(speed>60)speed-=3; clearInterval(gameLoop); gameLoop=setInterval(tick,speed);
    } else { snake.pop(); }
  }

  function tick() { if (paused) return; update(); draw(); }

  function gameOverFn() {
    running=false; clearInterval(gameLoop); SFX.die();
    overlayEmoji.textContent='💀'; overlayTitle.textContent='Game Over';
    overlayMsg.textContent=`Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame() {
    overlay.classList.remove('active');
    init(); draw(); running=true; paused=false;
    $('btn-pause').textContent = '⏸';
    gameLoop=setInterval(tick,speed);
  }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    init(); draw();
    overlayEmoji.textContent='🐍'; overlayTitle.textContent='Ready?';
    overlayMsg.textContent='Press arrow key or tap Play';
    overlay.classList.add('active'); running=false;
  }

  // Controls
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if(running) togglePause(); return; }
    if (paused) return;
    const map = {ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    if(map[e.key]){
      e.preventDefault();
      if(!running){ startGame(); return; }
      const d=map[e.key];
      if(d.x!==-dir.x||d.y!==-dir.y){ nextDir=d; SFX.turn(); }
    }
  });

  document.querySelectorAll('.dpad-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const map={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
      const d=map[btn.dataset.dir];
      if(!running){ startGame(); return; }
      if(d.x!==-dir.x||d.y!==-dir.y){ nextDir=d; SFX.turn(); }
    });
  });

  window.addEventListener('resize', ()=>{ if(screenGame.classList.contains('screen--active')) resize(); });

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', ()=>{ SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', ()=>{ SFX.click(); togglePause(); });
})();
