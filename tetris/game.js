/* Tetris — Game Engine + Home Screen + SFX */
(() => {
  'use strict';

  // ─── PARTICLES ───────────────────────────
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) { const p = document.createElement('div'); p.classList.add('particle'); const s = Math.random()*4+2; p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`; pc.appendChild(p); }

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f, d, t='sine', v=0.15) { if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }

  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    move()   { playTone(300, 0.05, 'triangle', 0.06); },
    rotate() { playTone(500, 0.08, 'sine', 0.08); },
    drop()   { playTone(200, 0.12, 'square', 0.1); },
    lock()   { playTone(250, 0.1, 'triangle', 0.08); },
    clear()  { playTone(800, 0.15, 'sine', 0.12); setTimeout(()=>playTone(1000,0.12,'sine',0.1),80); },
    tetris() { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sine',0.12),i*80)); },
    over()   { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  // ─── DOM ─────────────────────────────────
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const nextCanvas = $('next-canvas'), nctx = nextCanvas.getContext('2d');
  const overlay = $('overlay');

  // ─── TETRIS CONFIG ──────────────────────
  const COLS = 10, ROWS = 20, CELL = 24;
  canvas.width = COLS * CELL; canvas.height = ROWS * CELL;

  const PIECES = [
    { shape: [[1,1,1,1]], color: '#06b6d4' },         // I
    { shape: [[1,1],[1,1]], color: '#eab308' },         // O
    { shape: [[0,1,0],[1,1,1]], color: '#8b5cf6' },     // T
    { shape: [[1,0],[1,0],[1,1]], color: '#f97316' },   // L
    { shape: [[0,1],[0,1],[1,1]], color: '#3b82f6' },   // J
    { shape: [[0,1,1],[1,1,0]], color: '#22c55e' },     // S
    { shape: [[1,1,0],[0,1,1]], color: '#ef4444' },     // Z
  ];

  let grid, piece, nextPiece, px, py, score, best, level, linesCleared, gameLoop, dropInterval, running, paused = false;
  best = parseInt(localStorage.getItem('tetris_best') || '0');
  $('best').textContent = best;

  const savedSound = localStorage.getItem('tetris_sound');
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
      $('ov-emoji').textContent = '⏸'; $('ov-title').textContent = 'Paused';
      $('ov-msg').textContent = 'Press P or Esc to resume';
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
      gameLoop = setInterval(tick, dropInterval);
    }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('tetris_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function newPiece() { const p = PIECES[Math.floor(Math.random()*PIECES.length)]; return { shape: p.shape.map(r=>[...r]), color: p.color }; }

  function init() {
    grid = Array.from({length:ROWS}, () => Array(COLS).fill(null));
    piece = newPiece(); nextPiece = newPiece();
    px = Math.floor((COLS - piece.shape[0].length)/2); py = 0;
    score = 0; level = 1; linesCleared = 0; dropInterval = 800;
    $('score').textContent = 0; $('level').textContent = 1; $('lines').textContent = 0;
    drawNext();
  }

  function valid(shape, cx, cy) {
    for (let r=0;r<shape.length;r++) for (let c=0;c<shape[r].length;c++) {
      if (!shape[r][c]) continue;
      const nx=cx+c, ny=cy+r;
      if (nx<0||nx>=COLS||ny>=ROWS) return false;
      if (ny>=0&&grid[ny][nx]) return false;
    }
    return true;
  }

  function rotate(shape) {
    const rows=shape.length, cols=shape[0].length;
    const rot=Array.from({length:cols},()=>Array(rows).fill(0));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) rot[c][rows-1-r]=shape[r][c];
    return rot;
  }

  function lock() {
    for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++){
      if(!piece.shape[r][c])continue;
      const ny=py+r;
      if(ny<0){ gameOver(); return; }
      grid[ny][px+c]=piece.color;
    }
    SFX.lock();
    // Clear lines
    let cleared=0;
    for(let r=ROWS-1;r>=0;r--){
      if(grid[r].every(c=>c)){grid.splice(r,1);grid.unshift(Array(COLS).fill(null));cleared++;r++;}
    }
    if(cleared>0){
      linesCleared+=cleared;
      const pts=[0,100,300,500,800];
      score+=pts[cleared]*level;
      $('score').textContent=score;$('lines').textContent=linesCleared;
      if(score>best){best=score;$('best').textContent=best;localStorage.setItem('tetris_best',String(best));}
      level=Math.floor(linesCleared/10)+1;$('level').textContent=level;
      dropInterval=Math.max(100,800-((level-1)*70));
      clearInterval(gameLoop);gameLoop=setInterval(tick,dropInterval);
      if(cleared>=4)SFX.tetris();else SFX.clear();
    }
    piece=nextPiece;nextPiece=newPiece();
    px=Math.floor((COLS-piece.shape[0].length)/2);py=0;
    drawNext();
    if(!valid(piece.shape,px,py))gameOver();
  }

  function ghostY() { let gy=py; while(valid(piece.shape,px,gy+1))gy++; return gy; }

  function draw() {
    ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=0.5;
    for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,canvas.height);ctx.stroke();}
    for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(canvas.width,y*CELL);ctx.stroke();}

    // Locked blocks
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      if(!grid[r][c])continue;
      ctx.fillStyle=grid[r][c];ctx.shadowColor=grid[r][c];ctx.shadowBlur=4;
      ctx.beginPath();ctx.roundRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(c*CELL+2,r*CELL+1,CELL-4,3);
    }
    ctx.shadowBlur=0;

    // Ghost
    const gy=ghostY();
    for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++){
      if(!piece.shape[r][c])continue;
      ctx.strokeStyle=piece.color;ctx.globalAlpha=0.25;ctx.lineWidth=1;
      ctx.strokeRect((px+c)*CELL+2,(gy+r)*CELL+2,CELL-4,CELL-4);
      ctx.globalAlpha=1;
    }

    // Active piece
    for(let r=0;r<piece.shape.length;r++) for(let c=0;c<piece.shape[r].length;c++){
      if(!piece.shape[r][c])continue;
      ctx.fillStyle=piece.color;ctx.shadowColor=piece.color;ctx.shadowBlur=6;
      ctx.beginPath();ctx.roundRect((px+c)*CELL+1,(py+r)*CELL+1,CELL-2,CELL-2,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect((px+c)*CELL+2,(py+r)*CELL+1,CELL-4,3);
    }
    ctx.shadowBlur=0;
  }

  function drawNext() {
    nctx.fillStyle='rgba(0,0,0,0.3)';nctx.fillRect(0,0,80,80);
    const s=nextPiece.shape, cs=16;
    const ox=(80-s[0].length*cs)/2, oy=(80-s.length*cs)/2;
    for(let r=0;r<s.length;r++) for(let c=0;c<s[r].length;c++){
      if(!s[r][c])continue;
      nctx.fillStyle=nextPiece.color;
      nctx.beginPath();nctx.roundRect(ox+c*cs+1,oy+r*cs+1,cs-2,cs-2,2);nctx.fill();
    }
  }

  function tick() {
    if(!running)return;
    if(valid(piece.shape,px,py+1)){py++;}else{lock();}
    draw();
  }

  function gameOver() {
    running=false;clearInterval(gameLoop);SFX.over();
    $('ov-emoji').textContent='💀';$('ov-title').textContent='Game Over';
    $('ov-msg').textContent=`Score: ${score} | Level: ${level}`;
    overlay.classList.add('active');
  }

  function startGame() {
    overlay.classList.remove('active');
    init();draw();running=true;paused=false;
    $('btn-pause').textContent = '⏸';
    clearInterval(gameLoop);gameLoop=setInterval(tick,dropInterval);
  }

  function showGameScreen() {
    SFX.click();showScreen('game');
    init();draw();
    $('ov-emoji').textContent='🧱';$('ov-title').textContent='Ready?';
    $('ov-msg').textContent='Press Play to start!';
    overlay.classList.add('active');running=false;
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if(running) togglePause(); return; }
    if(!running || paused)return;
    switch(e.key){
      case'ArrowLeft':e.preventDefault();if(valid(piece.shape,px-1,py)){px--;SFX.move();}break;
      case'ArrowRight':e.preventDefault();if(valid(piece.shape,px+1,py)){px++;SFX.move();}break;
      case'ArrowDown':e.preventDefault();if(valid(piece.shape,px,py+1)){py++;score++;$('score').textContent=score;}break;
      case'ArrowUp':e.preventDefault();{const rot=rotate(piece.shape);const kicks=[0,-1,1,-2,2];for(const k of kicks){if(valid(rot,px+k,py)){piece.shape=rot;px+=k;SFX.rotate();break;}}}break;
      case' ':e.preventDefault();while(valid(piece.shape,px,py+1)){py++;score+=2;}$('score').textContent=score;lock();SFX.drop();break;
    }
    draw();
  });

  // Mobile controls
  document.querySelectorAll('.ctrl-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!running)return;
      const act=btn.dataset.act;
      if(act==='left'&&valid(piece.shape,px-1,py)){px--;SFX.move();}
      if(act==='right'&&valid(piece.shape,px+1,py)){px++;SFX.move();}
      if(act==='down'&&valid(piece.shape,px,py+1)){py++;score++;$('score').textContent=score;}
      if(act==='rotate'){const rot=rotate(piece.shape);const kicks=[0,-1,1,-2,2];for(const k of kicks){if(valid(rot,px+k,py)){piece.shape=rot;px+=k;SFX.rotate();break;}}}
      if(act==='drop'){while(valid(piece.shape,px,py+1)){py++;score+=2;}$('score').textContent=score;lock();SFX.drop();}
      draw();
    });
  });

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', ()=>{ SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
  $('btn-pause').addEventListener('click', ()=>{ SFX.click(); togglePause(); });
})();
