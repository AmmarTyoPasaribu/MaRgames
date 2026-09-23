/* Connect Four — Game Engine + Home Screen + SFX + Minimax AI */
(() => {
  'use strict';

  const ROWS = 6, COLS = 7;

  // ─── PARTICLES ───────────────────────────
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div'); p.classList.add('particle');
    const s = Math.random()*4+2;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`;
    pc.appendChild(p);
  }

  // ─── SOUND ENGINE ────────────────────────
  let audioCtx = null;
  let soundEnabled = true;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', vol = 0.15) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    drop1()  { playTone(300, 0.1, 'triangle', 0.12); },
    drop2()  { playTone(380, 0.1, 'triangle', 0.12); },
    win()    { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.12), i*120)); },
    lose()   { [400,350,300,250].forEach((f,i) => setTimeout(() => playTone(f, 0.25, 'sine', 0.1), i*120)); },
    draw()   { playTone(350, 0.3, 'triangle', 0.1); setTimeout(() => playTone(350, 0.3, 'triangle', 0.1), 200); },
  };

  // ─── DOM ─────────────────────────────────
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home');
  const screenGame = $('screen-game');
  const boardEl = $('board');
  const statusEl = $('status');

  // ─── STATE ───────────────────────────────
  let board, currentPlayer, gameOver, vsAI, aiTimer = null;
  let stats = JSON.parse(localStorage.getItem('c4_stats') || '{"p1":0,"p2":0,"d":0}');

  function showScreen(name) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
  }

  // ─── SOUND TOGGLE ────────────────────────
  const savedSound = localStorage.getItem('c4_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('c4_sound', soundEnabled ? 'on' : 'off');
    updateSoundUI();
    if (soundEnabled) SFX.click();
  }

  function updateSoundUI() {
    $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇';
  }

  // ─── SCORE DISPLAY ──────────────────────
  function updateScores() {
    $('p1-wins').textContent = stats.p1;
    $('p2-wins').textContent = stats.p2;
    $('draws').textContent = stats.d;
  }

  // ─── BOARD HELPERS ───────────────────────
  const idx = (r, c) => r * COLS + c;

  function dropRow(bd, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!bd[idx(r, col)]) return r;
    }
    return -1;
  }

  function findWin(bd, r, c) {
    const p = bd[idx(r, c)];
    if (!p) return null;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let cells = [[r, c]];
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && bd[idx(nr, nc)] === p) { cells.push([nr, nc]); nr += dr; nc += dc; }
      nr = r - dr; nc = c - dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && bd[idx(nr, nc)] === p) { cells.push([nr, nc]); nr -= dr; nc -= dc; }
      if (cells.length >= 4) return cells;
    }
    return null;
  }

  function isFull(bd) {
    for (let c = 0; c < COLS; c++) if (!bd[idx(0, c)]) return false;
    return true;
  }

  // ─── RENDER ──────────────────────────────
  function init() {
    board = new Array(ROWS * COLS).fill(0);
    currentPlayer = 1;
    gameOver = false;
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    statusEl.textContent = "Red's turn";
    boardEl.innerHTML = '';
    boardEl.className = 'board';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.classList.add('col-hit');
        cell.dataset.col = c;
        cell.dataset.row = r;
        const disc = document.createElement('div');
        disc.classList.add('disc');
        cell.appendChild(disc);
        boardEl.appendChild(cell);
      }
    }
    updateScores();
  }

  function handleColumn(col) {
    if (gameOver) return;
    if (vsAI && currentPlayer === 2) return;
    dropInColumn(col);
  }

  function dropInColumn(col) {
    const row = dropRow(board, col);
    if (row === -1) return;
    board[idx(row, col)] = currentPlayer;
    const cell = boardEl.querySelector(`.col-hit[data-row="${row}"][data-col="${col}"]`);
    const disc = cell.querySelector('.disc');
    disc.classList.add(currentPlayer === 1 ? 'p1' : 'p2', 'drop');

    currentPlayer === 1 ? SFX.drop1() : SFX.drop2();

    const win = findWin(board, row, col);
    if (win) {
      gameOver = true;
      statusEl.textContent = currentPlayer === 1 ? '🎉 Red Wins!' : '🎉 Yellow Wins!';
      win.forEach(([r, c]) => boardEl.querySelector(`.col-hit[data-row="${r}"][data-col="${c}"]`).classList.add('win-cell'));
      if (currentPlayer === 1) { stats.p1++; SFX.win(); }
      else { stats.p2++; if (vsAI) SFX.lose(); else SFX.win(); }
      localStorage.setItem('c4_stats', JSON.stringify(stats));
      updateScores();
      return;
    }

    if (isFull(board)) {
      gameOver = true;
      statusEl.textContent = "🤝 It's a Draw!";
      stats.d++;
      localStorage.setItem('c4_stats', JSON.stringify(stats));
      updateScores();
      SFX.draw();
      return;
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
    statusEl.textContent = currentPlayer === 1 ? "Red's turn" : "Yellow's turn";

    if (!gameOver && vsAI && currentPlayer === 2) {
      aiTimer = setTimeout(() => {
        aiTimer = null;
        if (gameOver) return;
        const col2 = bestMove(board);
        if (col2 !== -1) dropInColumn(col2);
      }, 400);
    }
  }

  // ─── MINIMAX AI (alpha-beta) ─────────────
  const AI_DEPTH = 5;

  function validCols(bd) {
    const cols = [];
    for (let c = 0; c < COLS; c++) if (!bd[idx(0, c)]) cols.push(c);
    return cols;
  }

  function windowScore(cells, piece) {
    const opp = piece === 1 ? 2 : 1;
    let pc = 0, oc = 0, ec = 0;
    for (const v of cells) { if (v === piece) pc++; else if (v === opp) oc++; else ec++; }
    if (pc === 4) return 100000;
    if (pc === 3 && ec === 1) return 100;
    if (pc === 2 && ec === 2) return 10;
    if (oc === 3 && ec === 1) return -120;
    if (oc === 2 && ec === 2) return -8;
    return 0;
  }

  function evaluate(bd, piece) {
    let score = 0;
    // center column preference
    for (let r = 0; r < ROWS; r++) if (bd[idx(r, 3)] === piece) score += 6;

    // horizontal
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS - 3; c++)
        score += windowScore([bd[idx(r,c)],bd[idx(r,c+1)],bd[idx(r,c+2)],bd[idx(r,c+3)]], piece);
    // vertical
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS - 3; r++)
        score += windowScore([bd[idx(r,c)],bd[idx(r+1,c)],bd[idx(r+2,c)],bd[idx(r+3,c)]], piece);
    // diag down-right
    for (let r = 0; r < ROWS - 3; r++)
      for (let c = 0; c < COLS - 3; c++)
        score += windowScore([bd[idx(r,c)],bd[idx(r+1,c+1)],bd[idx(r+2,c+2)],bd[idx(r+3,c+3)]], piece);
    // diag up-right
    for (let r = 3; r < ROWS; r++)
      for (let c = 0; c < COLS - 3; c++)
        score += windowScore([bd[idx(r,c)],bd[idx(r-1,c+1)],bd[idx(r-2,c+2)],bd[idx(r-3,c+3)]], piece);

    return score;
  }

  function hasAnyWin(bd) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (bd[idx(r, c)] && findWin(bd, r, c)) return true;
      }
    }
    return false;
  }

  function minimax(bd, depth, alpha, beta, maximizing) {
    const cols = validCols(bd);
    const full = cols.length === 0;
    const win = hasAnyWin(bd);

    if (win) {
      // the player who just moved caused this; since we check after simulated move,
      // scoring handled by caller context via large constant
      return maximizing ? -1000000 + (AI_DEPTH - depth) : 1000000 - (AI_DEPTH - depth);
    }
    if (full) return 0;
    if (depth === 0) return evaluate(bd, 2) - evaluate(bd, 1);

    if (maximizing) {
      let best = -Infinity;
      for (const c of cols) {
        const r = dropRow(bd, c);
        bd[idx(r, c)] = 2;
        const val = minimax(bd, depth - 1, alpha, beta, false);
        bd[idx(r, c)] = 0;
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const c of cols) {
        const r = dropRow(bd, c);
        bd[idx(r, c)] = 1;
        const val = minimax(bd, depth - 1, alpha, beta, true);
        bd[idx(r, c)] = 0;
        best = Math.min(best, val);
        beta = Math.min(beta, best);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function bestMove(bd) {
    const cols = validCols(bd).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
    if (cols.length === 0) return -1;

    // immediate win check
    for (const c of cols) {
      const r = dropRow(bd, c);
      bd[idx(r, c)] = 2;
      const win = findWin(bd, r, c);
      bd[idx(r, c)] = 0;
      if (win) return c;
    }
    // immediate block check
    for (const c of cols) {
      const r = dropRow(bd, c);
      bd[idx(r, c)] = 1;
      const win = findWin(bd, r, c);
      bd[idx(r, c)] = 0;
      if (win) return c;
    }

    let best = -Infinity, move = cols[0];
    for (const c of cols) {
      const r = dropRow(bd, c);
      bd[idx(r, c)] = 2;
      const val = minimax(bd, AI_DEPTH - 1, -Infinity, Infinity, false);
      bd[idx(r, c)] = 0;
      if (val > best) { best = val; move = c; }
    }
    return move;
  }

  // ─── EVENTS ─────────────────────────────
  boardEl.addEventListener('click', e => {
    const cell = e.target.closest('.col-hit');
    if (!cell) return;
    handleColumn(parseInt(cell.dataset.col, 10));
  });

  boardEl.addEventListener('mousemove', e => {
    const cell = e.target.closest('.col-hit');
    boardEl.className = 'board' + (cell ? ' col-hover-' + cell.dataset.col : '');
  });
  boardEl.addEventListener('mouseleave', () => { boardEl.className = 'board'; });

  $('btn-play-ai').addEventListener('click', () => { SFX.click(); vsAI = true; showScreen('game'); init(); });
  $('btn-play-pvp').addEventListener('click', () => { SFX.click(); vsAI = false; showScreen('game'); init(); });
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', () => { SFX.click(); init(); });
  $('btn-sound').addEventListener('click', toggleSound);

  updateScores();
})();
