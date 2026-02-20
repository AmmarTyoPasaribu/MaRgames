/* 2048 — Game Engine + Home Screen + SFX */
(() => {
  'use strict';

  // ─── PARTICLES ───────────────────────────
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 20; i++) { const p = document.createElement('div'); p.classList.add('particle'); const s = Math.random()*4+2; p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`; pc.appendChild(p); }

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }

  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    slide() { playTone(300, 0.06, 'triangle', 0.06); },
    merge() { playTone(600, 0.1, 'sine', 0.1); setTimeout(()=>playTone(800,0.08,'sine',0.08),50); },
    win()   { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*120)); },
    over()  { [400,350,300,250].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const boardEl = $('board'), scoreEl = $('score'), bestEl = $('best'), statusEl = $('status');

  const SIZE = 4;
  let grid, score, best, gameOverFlag;
  best = parseInt(localStorage.getItem('2048_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('2048_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('2048_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    grid = Array.from({length:SIZE}, () => Array(SIZE).fill(0));
    score = 0; gameOverFlag = false;
    scoreEl.textContent = 0; statusEl.textContent = '';
    addRandom(); addRandom(); render();
  }

  function addRandom() {
    const empty = [];
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (!grid[r][c]) empty.push({r,c});
    if (!empty.length) return;
    const {r,c} = empty[Math.floor(Math.random()*empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render(mergedCells, newCells) {
    boardEl.innerHTML = '';
    for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
      const d = document.createElement('div');
      d.classList.add('tile');
      const v = grid[r][c];
      if (v) {
        d.textContent = v; d.dataset.v = v;
        const key = `${r}-${c}`;
        if (mergedCells && mergedCells.has(key)) d.classList.add('merge');
        else if (newCells && newCells.has(key)) d.classList.add('pop');
      }
      boardEl.appendChild(d);
    }
  }

  function slide(row) {
    let arr = row.filter(v=>v);
    const merged = [];
    for (let i=0;i<arr.length-1;i++) {
      if (arr[i]===arr[i+1]) { arr[i]*=2; score+=arr[i]; arr.splice(i+1,1); merged.push(i); }
    }
    while (arr.length<SIZE) arr.push(0);
    return {arr, merged};
  }

  function move(dir) {
    if (gameOverFlag) return;
    const prev = grid.map(r=>[...r]);
    const mergedCells = new Set();
    let hadMerge = false;

    if (dir==='left') { for(let r=0;r<SIZE;r++){const res=slide(grid[r]);grid[r]=res.arr;res.merged.forEach(c=>{mergedCells.add(`${r}-${c}`);hadMerge=true;});} }
    else if (dir==='right') { for(let r=0;r<SIZE;r++){const res=slide([...grid[r]].reverse());grid[r]=res.arr.reverse();res.merged.forEach(c=>{mergedCells.add(`${r}-${SIZE-1-c}`);hadMerge=true;});} }
    else if (dir==='up') { for(let c=0;c<SIZE;c++){const col=[];for(let r=0;r<SIZE;r++)col.push(grid[r][c]);const res=slide(col);for(let r=0;r<SIZE;r++)grid[r][c]=res.arr[r];res.merged.forEach(r=>{mergedCells.add(`${r}-${c}`);hadMerge=true;});} }
    else if (dir==='down') { for(let c=0;c<SIZE;c++){const col=[];for(let r=SIZE-1;r>=0;r--)col.push(grid[r][c]);const res=slide(col);for(let r=SIZE-1,i=0;r>=0;r--,i++)grid[r][c]=res.arr[i];res.merged.forEach(r=>{mergedCells.add(`${SIZE-1-r}-${c}`);hadMerge=true;});} }

    const changed = grid.some((row,r) => row.some((v,c) => v !== prev[r][c]));
    if (!changed) return;

    if (hadMerge) SFX.merge(); else SFX.slide();

    scoreEl.textContent = score;
    if (score > best) { best=score; bestEl.textContent=best; localStorage.setItem('2048_best',String(best)); }

    addRandom();
    const newCells = new Set();
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(grid[r][c] && !prev[r][c] && !mergedCells.has(`${r}-${c}`)) newCells.add(`${r}-${c}`);
    render(mergedCells, newCells);

    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(grid[r][c]===2048) { statusEl.textContent='🎉 You reached 2048!'; SFX.win(); }
    if (isGameOver()) { gameOverFlag=true; statusEl.textContent='💀 Game Over! Score: '+score; SFX.over(); }
  }

  function isGameOver() {
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) {
      if(!grid[r][c]) return false;
      if(c<SIZE-1 && grid[r][c]===grid[r][c+1]) return false;
      if(r<SIZE-1 && grid[r][c]===grid[r+1][c]) return false;
    }
    return true;
  }

  document.addEventListener('keydown', e => {
    const map = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  });

  let sx,sy;
  document.addEventListener('touchstart', e => { sx=e.touches[0].clientX; sy=e.touches[0].clientY; }, {passive:true});
  document.addEventListener('touchend', e => {
    const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    if (Math.max(Math.abs(dx),Math.abs(dy))<30) return;
    if (Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left');
    else move(dy>0?'down':'up');
  }, {passive:true});

  $('btn-home-play').addEventListener('click', () => { SFX.click(); showScreen('game'); init(); });
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', () => { SFX.click(); init(); });
  $('btn-sound').addEventListener('click', toggleSound);
})();
