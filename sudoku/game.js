/* Sudoku — Game Engine + Home Screen + SFX */
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
    click()  { playTone(600, 0.08, 'square', 0.08); },
    place()  { playTone(500, 0.08, 'triangle', 0.1); },
    error()  { playTone(200, 0.2, 'square', 0.1); },
    erase()  { playTone(350, 0.06, 'triangle', 0.06); },
    win()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const boardEl = $('board'), numpadEl = $('numpad');
  const timerEl = $('timer'), errorsEl = $('errors'), bestEl = $('best');

  const CLUES = { easy: 38, medium: 30, hard: 24 };
  let solution, puzzle, userGrid, selectedCell, errors, time, timerInterval, difficulty, gameOver;

  const savedSound = localStorage.getItem('sudoku_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') clearInterval(timerInterval);
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('sudoku_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function formatTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

  // ─── GENERATOR ──────────────────────────
  function generate() {
    const grid = Array.from({length:9},()=>Array(9).fill(0));
    function canPlace(g,r,c,n){
      for(let i=0;i<9;i++){if(g[r][i]===n||g[i][c]===n)return false;}
      const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
      for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(g[i][j]===n)return false;
      return true;
    }
    function fill(g){
      for(let r=0;r<9;r++)for(let c=0;c<9;c++){
        if(g[r][c])continue;
        const nums=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-.5);
        for(const n of nums){if(canPlace(g,r,c,n)){g[r][c]=n;if(fill(g))return true;g[r][c]=0;}}
        return false;
      }
      return true;
    }
    fill(grid);
    return grid;
  }

  function createPuzzle(sol, clues) {
    const puz = sol.map(r=>[...r]);
    const cells = [];
    for(let r=0;r<9;r++)for(let c=0;c<9;c++)cells.push([r,c]);
    cells.sort(()=>Math.random()-.5);
    let toRemove = 81 - clues;
    for(const [r,c] of cells){if(toRemove<=0)break;puz[r][c]=0;toRemove--;}
    return puz;
  }

  function init(diff) {
    difficulty = diff;
    solution = generate();
    puzzle = createPuzzle(solution, CLUES[diff]);
    userGrid = puzzle.map(r=>[...r]);
    selectedCell = null; errors = 0; time = 0; gameOver = false;
    errorsEl.textContent = 0; timerEl.textContent = '00:00';

    const best = localStorage.getItem(`sudoku_best_${diff}`);
    bestEl.textContent = best ? formatTime(parseInt(best)) : '--:--';

    clearInterval(timerInterval);
    timerInterval = setInterval(()=>{ if(!gameOver){time++;timerEl.textContent=formatTime(time);} },1000);

    buildBoard(); buildNumpad();
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){
      const cell = document.createElement('div');
      cell.classList.add('sudoku-cell');
      cell.dataset.r = r; cell.dataset.c = c;
      if(c%3===2&&c<8)cell.classList.add('b-right');
      if(r%3===2&&r<8)cell.classList.add('b-bottom');
      if(puzzle[r][c]){cell.textContent=puzzle[r][c];cell.classList.add('given');}
      else if(userGrid[r][c]){cell.textContent=userGrid[r][c];cell.classList.add('user');}
      cell.addEventListener('click',()=>selectCell(r,c));
      boardEl.appendChild(cell);
    }
  }

  function buildNumpad() {
    numpadEl.innerHTML = '';
    for(let n=1;n<=9;n++){
      const btn = document.createElement('button');
      btn.classList.add('num-btn');btn.textContent=n;
      btn.addEventListener('click',()=>placeNumber(n));
      numpadEl.appendChild(btn);
    }
    const eraseBtn = document.createElement('button');
    eraseBtn.classList.add('num-btn','erase');eraseBtn.textContent='✕';
    eraseBtn.addEventListener('click',()=>placeNumber(0));
    numpadEl.appendChild(eraseBtn);
  }

  function selectCell(r,c) {
    if(gameOver)return;
    selectedCell = {r,c};
    SFX.click();
    updateHighlights();
  }

  function updateHighlights() {
    document.querySelectorAll('.sudoku-cell').forEach(el=>{
      el.classList.remove('selected','highlight');
      if(!selectedCell)return;
      const cr=+el.dataset.r,cc=+el.dataset.c;
      if(cr===selectedCell.r&&cc===selectedCell.c)el.classList.add('selected');
      else if(cr===selectedCell.r||cc===selectedCell.c||
        (Math.floor(cr/3)===Math.floor(selectedCell.r/3)&&Math.floor(cc/3)===Math.floor(selectedCell.c/3)))
        el.classList.add('highlight');
    });
  }

  function placeNumber(n) {
    if(!selectedCell||gameOver)return;
    const {r,c}=selectedCell;
    if(puzzle[r][c])return; // Given cell

    const cell = boardEl.children[r*9+c];

    if(n===0){
      userGrid[r][c]=0;cell.textContent='';cell.className='sudoku-cell';
      if(c%3===2&&c<8)cell.classList.add('b-right');
      if(r%3===2&&r<8)cell.classList.add('b-bottom');
      SFX.erase();
      updateHighlights();return;
    }

    userGrid[r][c]=n;cell.textContent=n;
    cell.classList.remove('error');cell.classList.add('user');

    if(n!==solution[r][c]){
      cell.classList.add('error');errors++;errorsEl.textContent=errors;SFX.error();
    } else {
      SFX.place();
      // Check win
      let complete=true;
      for(let i=0;i<9;i++)for(let j=0;j<9;j++)if(userGrid[i][j]!==solution[i][j])complete=false;
      if(complete){
        gameOver=true;clearInterval(timerInterval);SFX.win();
        const best=localStorage.getItem(`sudoku_best_${difficulty}`);
        if(!best||time<parseInt(best)){localStorage.setItem(`sudoku_best_${difficulty}`,String(time));bestEl.textContent=formatTime(time);}
        setTimeout(()=>alert('🎉 Puzzle Complete! Time: '+formatTime(time)),300);
      }
    }
    updateHighlights();
  }

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(!selectedCell||gameOver)return;
    if(e.key>='1'&&e.key<='9'){placeNumber(+e.key);return;}
    if(e.key==='Backspace'||e.key==='Delete'){placeNumber(0);return;}
    const {r,c}=selectedCell;
    if(e.key==='ArrowUp'&&r>0){selectedCell.r--;updateHighlights();}
    if(e.key==='ArrowDown'&&r<8){selectedCell.r++;updateHighlights();}
    if(e.key==='ArrowLeft'&&c>0){selectedCell.c--;updateHighlights();}
    if(e.key==='ArrowRight'&&c<8){selectedCell.c++;updateHighlights();}
  });

  // Events
  document.querySelectorAll('.mode-card').forEach(btn=>{
    btn.addEventListener('click',()=>{SFX.click();showScreen('game');init(btn.dataset.diff);});
  });
  $('btn-back').addEventListener('click',()=>{SFX.click();clearInterval(timerInterval);showScreen('home');});
  $('btn-new').addEventListener('click',()=>{SFX.click();init(difficulty||'easy');});
  $('btn-sound').addEventListener('click',toggleSound);
})();
