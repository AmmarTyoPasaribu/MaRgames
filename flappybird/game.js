/* Flappy Bird — Game Engine + Home Screen + SFX */
(() => {
  'use strict';

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }

  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    flap()  { playTone(400, 0.08, 'triangle', 0.1); setTimeout(()=>playTone(500,0.06,'triangle',0.08),40); },
    score() { playTone(880, 0.1, 'sine', 0.12); setTimeout(()=>playTone(1100,0.08,'sine',0.1),60); },
    crash() {
      if(!soundEnabled)return;
      try{const c=getAudioCtx(),b=c.createBuffer(1,c.sampleRate*0.3,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.2,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.3);s.connect(g);g.connect(c.destination);s.start();}catch(e){}
    },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const scoreEl = $('score'), bestEl = $('best');
  const overlay = $('overlay');

  const W = 320, H = 480;
  canvas.width = W; canvas.height = H;

  let bird, pipes, score, best, frame, running, started, paused = false;
  best = parseInt(localStorage.getItem('flappy_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('flappy_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { running = false; paused = false; cancelAnimationFrame(loop); }
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    $('btn-pause').textContent = paused ? '▶' : '⏸';
    if (paused) {
      cancelAnimationFrame(loop);
      $('ov-emoji').textContent = '⏸'; $('ov-title').textContent = 'Paused';
      $('ov-msg').textContent = 'Press P or Esc to resume';
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
      tick();
    }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('flappy_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    bird = { x: 80, y: H/2, vy: 0, r: 14 };
    pipes = []; score = 0; frame = 0; started = false;
    scoreEl.textContent = 0;
  }

  function flap() {
    if (!running) return;
    if (!started) started = true;
    bird.vy = -6.5;
    SFX.flap();
  }

  function draw() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#0c1222');grad.addColorStop(1,'#0a1a2e');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

    // Stars
    ctx.fillStyle='rgba(255,255,255,0.15)';
    for(let i=0;i<20;i++){const sx=(i*73+frame*0.2)%W,sy=(i*47)%H;ctx.fillRect(sx,sy,1.5,1.5);}

    // Ground
    ctx.fillStyle='#1a2744';ctx.fillRect(0,H-40,W,40);
    ctx.fillStyle='#22c55e';ctx.fillRect(0,H-40,W,3);

    // Pipes
    pipes.forEach(p=>{
      const grad2=ctx.createLinearGradient(p.x,0,p.x+p.w,0);
      grad2.addColorStop(0,'#166534');grad2.addColorStop(0.5,'#22c55e');grad2.addColorStop(1,'#166534');
      ctx.fillStyle=grad2;
      ctx.beginPath();ctx.roundRect(p.x,0,p.w,p.top,4);ctx.fill();
      ctx.beginPath();ctx.roundRect(p.x,p.top+p.gap,p.w,H-p.top-p.gap,4);ctx.fill();
      // Pipe caps
      ctx.fillStyle='#15803d';
      ctx.fillRect(p.x-3,p.top-16,p.w+6,16);
      ctx.fillRect(p.x-3,p.top+p.gap,p.w+6,16);
    });

    // Bird
    ctx.save();ctx.translate(bird.x,bird.y);
    const angle=Math.min(Math.max(bird.vy*3,-30),60)*Math.PI/180;
    ctx.rotate(angle);
    // Body
    ctx.fillStyle='#fbbf24';ctx.shadowColor='#f59e0b';ctx.shadowBlur=10;
    ctx.beginPath();ctx.ellipse(0,0,bird.r,bird.r*0.8,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // Wing
    ctx.fillStyle='#f59e0b';
    ctx.beginPath();ctx.ellipse(-4,2,8,5,-.3,0,Math.PI*2);ctx.fill();
    // Eye
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(6,-3,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(7,-3,2,0,Math.PI*2);ctx.fill();
    // Beak
    ctx.fillStyle='#ef4444';ctx.beginPath();ctx.moveTo(12,-1);ctx.lineTo(18,1);ctx.lineTo(12,4);ctx.fill();
    ctx.restore();
  }

  function update() {
    if(!started){draw();return;}
    frame++;
    bird.vy+=0.35;bird.y+=bird.vy;

    // Pipes
    if(frame%90===0){
      const top=60+Math.random()*(H-240);
      pipes.push({x:W,top,gap:140,w:44,scored:false});
    }

    pipes.forEach(p=>{
      p.x-=2.5;
      if(!p.scored&&p.x+p.w<bird.x){p.scored=true;score++;scoreEl.textContent=score;
        if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('flappy_best',String(best));}
        SFX.score();
      }
    });
    pipes=pipes.filter(p=>p.x>-60);

    // Collision
    if(bird.y+bird.r>H-40||bird.y-bird.r<0){gameOverFn();return;}
    for(const p of pipes){
      if(bird.x+bird.r>p.x&&bird.x-bird.r<p.x+p.w){
        if(bird.y-bird.r<p.top||bird.y+bird.r>p.top+p.gap){gameOverFn();return;}
      }
    }
    draw();
  }

  let loop;
  function tick(){if(!running || paused)return;update();loop=requestAnimationFrame(tick);}

  function gameOverFn(){
    running=false;cancelAnimationFrame(loop);SFX.crash();
    $('ov-emoji').textContent='💀';$('ov-title').textContent='Game Over';
    $('ov-msg').textContent=`Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame(){
    overlay.classList.remove('active');
    init();draw();running=true;paused=false;
    $('btn-pause').textContent = '⏸';
    tick();
  }

  function showGameScreen(){
    SFX.click();showScreen('game');
    init();draw();
    $('ov-emoji').textContent='🐦';$('ov-title').textContent='Ready?';
    $('ov-msg').textContent='Tap or Space to fly!';
    overlay.classList.add('active');running=false;
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(running)togglePause();return;}
    if(paused)return;
    if(e.code==='Space'){e.preventDefault();if(!running)startGame();else flap();}
  });
  canvas.addEventListener('click',()=>{if(paused)return;if(!running)startGame();else flap();});
  canvas.addEventListener('touchstart',e=>{e.preventDefault();if(paused)return;if(!running)startGame();else flap();},{passive:false});

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', ()=>{ SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', ()=>{ SFX.click(); togglePause(); });
})();
