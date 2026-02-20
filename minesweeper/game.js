/* =============================================
   MINESWEEPER GAME — by MaRnevorget
   Game Engine + Stats + Sound Effects
   Pure vanilla JS, zero dependencies
   ============================================= */

(() => {
  'use strict';

  // ─── CONFIG ──────────────────────────────
  const DIFF = {
    easy:   { rows: 9,  cols: 9,  mines: 10, label: 'Easy' },
    medium: { rows: 16, cols: 16, mines: 40, label: 'Medium' },
    hard:   { rows: 16, cols: 30, mines: 99, label: 'Hard' },
  };

  const CELL_SIZES = { easy: 44, medium: 36, hard: 30 };

  // ─── STATE ───────────────────────────────
  let board = [];
  let difficulty = 'easy';
  let cfg = DIFF.easy;
  let status = 'idle';   // idle | playing | won | lost
  let time = 0;
  let minesPlaced = false;
  let flagMode = false;
  let timerInterval = null;
  let longPressTimer = null;
  let soundEnabled = true;

  // ─── DOM REFS ────────────────────────────
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home');
  const screenGame = $('screen-game');
  const boardEl     = $('board');
  const flagCountEl = $('flag-count');
  const timerEl     = $('timer');
  const smileyBtn   = $('btn-smiley');
  const titleEl     = $('game-title');
  const modal       = $('modal');
  const modalBox    = $('modal-box');
  const confettiBox = $('confetti-box');

  // ═══════════════════════════════════════════
  //  SOUND ENGINE (Web Audio API — no files!)
  // ═══════════════════════════════════════════
  let audioCtx = null;

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
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    reveal() { playTone(800, 0.1, 'sine', 0.1); },
    revealBig() {
      playTone(500, 0.15, 'sine', 0.08);
      setTimeout(() => playTone(700, 0.12, 'sine', 0.07), 50);
      setTimeout(() => playTone(900, 0.1, 'sine', 0.06), 100);
    },
    flag() { playTone(1000, 0.12, 'triangle', 0.1); },
    unflag() { playTone(500, 0.1, 'triangle', 0.08); },
    explode() {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioCtx();
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
      } catch(e) {}
    },
    win() {
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.3, 'sine', 0.12), i * 120);
      });
    },
  };

  // ═══════════════════════════════════════════
  //  STATS & BEST TIMES (localStorage)
  // ═══════════════════════════════════════════
  const STORAGE_KEY = 'minesweeper_marnevorget';

  function getStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultStats();
    } catch(e) { return defaultStats(); }
  }

  function defaultStats() {
    return {
      bestTimes: { easy: null, medium: null, hard: null },
      gamesPlayed: { easy: 0, medium: 0, hard: 0 },
      gamesWon: { easy: 0, medium: 0, hard: 0 },
      totalTime: { easy: 0, medium: 0, hard: 0 },
    };
  }

  function saveStats(stats) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch(e) {}
  }

  function recordGame(won) {
    const stats = getStats();
    stats.gamesPlayed[difficulty]++;
    if (won) {
      stats.gamesWon[difficulty]++;
      stats.totalTime[difficulty] += time;
      const best = stats.bestTimes[difficulty];
      if (best === null || time < best) {
        stats.bestTimes[difficulty] = time;
      }
    }
    saveStats(stats);
    return stats;
  }

  function getWinRate(diff) {
    const stats = getStats();
    const played = stats.gamesPlayed[diff];
    if (played === 0) return 0;
    return Math.round((stats.gamesWon[diff] / played) * 100);
  }

  // ─── RENDER STATS ON HOME ────────────────
  function renderHomeStats() {
    const stats = getStats();
    document.querySelectorAll('.diff-card').forEach(card => {
      const diff = card.dataset.diff;
      let badge = card.querySelector('.diff-card__stats');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'diff-card__stats';
        card.querySelector('.diff-card__info').appendChild(badge);
      }
      const best = stats.bestTimes[diff];
      const played = stats.gamesPlayed[diff];
      const winRate = getWinRate(diff);

      if (played > 0) {
        badge.innerHTML = `🏆 ${best !== null ? formatTime(best) : '--:--'} · ${winRate}% win · ${played} games`;
      } else {
        badge.innerHTML = '';
      }
    });
  }

  // ─── INIT ────────────────────────────────
  function init() {
    // Difficulty cards
    document.querySelectorAll('.diff-card').forEach(btn => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        cfg = DIFF[difficulty];
        SFX.click();
        showScreen('game');
        startNewGame();
      });
    });

    // Game buttons
    $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
    $('btn-new').addEventListener('click', () => { SFX.click(); startNewGame(); });
    smileyBtn.addEventListener('click', () => { SFX.click(); startNewGame(); });
    $('btn-play-again').addEventListener('click', () => { SFX.click(); hideModal(); startNewGame(); });
    $('btn-go-home').addEventListener('click', () => { SFX.click(); hideModal(); showScreen('home'); });

    // Flag mode toggle (mobile)
    $('btn-flag-mode').addEventListener('click', () => { SFX.click(); toggleFlagMode(); });

    // Sound toggle
    $('btn-sound').addEventListener('click', toggleSound);

    // Load sound preference
    const savedSound = localStorage.getItem('minesweeper_sound');
    soundEnabled = savedSound !== 'off';
    updateSoundUI();

    // Generate background particles
    generateParticles();

    // Show stats on cards
    renderHomeStats();
  }

  // ─── SOUND TOGGLE ────────────────────────
  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('minesweeper_sound', soundEnabled ? 'on' : 'off');
    updateSoundUI();
    if (soundEnabled) SFX.click();
  }

  function updateSoundUI() {
    const btn = $('btn-sound');
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.title = soundEnabled ? 'Sound On' : 'Sound Off';
  }

  // ─── SCREENS ─────────────────────────────
  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { clearTimer(); status = 'idle'; renderHomeStats(); }
  }

  // ─── NEW GAME ────────────────────────────
  function startNewGame() {
    clearTimer();
    time = 0;
    status = 'idle';
    minesPlaced = false;
    flagMode = false;
    updateFlagModeUI();
    board = createBoard(cfg.rows, cfg.cols);
    titleEl.textContent = `💣 ${cfg.label}`;
    smileyBtn.textContent = '🙂';
    updateTimer();
    updateFlagCount();
    renderBoard();
    updateBestTimeDisplay();
  }

  // ─── BOARD CREATION ──────────────────────
  function createBoard(rows, cols) {
    const b = [];
    for (let r = 0; r < rows; r++) {
      b[r] = [];
      for (let c = 0; c < cols; c++) {
        b[r][c] = { mine: false, revealed: false, flagged: false, adj: 0 };
      }
    }
    return b;
  }

  function placeMines(firstR, firstC) {
    let placed = 0;
    while (placed < cfg.mines) {
      const r = Math.floor(Math.random() * cfg.rows);
      const c = Math.floor(Math.random() * cfg.cols);
      if (board[r][c].mine) continue;
      if (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) continue;
      board[r][c].mine = true;
      placed++;
    }
    // Calculate adjacency numbers
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (board[r][c].mine) continue;
        let n = 0;
        forNeighbors(r, c, (nr, nc) => { if (board[nr][nc].mine) n++; });
        board[r][c].adj = n;
      }
    }
    minesPlaced = true;
  }

  function forNeighbors(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols) fn(nr, nc);
      }
    }
  }

  // ─── RENDER BOARD ────────────────────────
  function renderBoard() {
    const size = CELL_SIZES[difficulty];
    boardEl.style.gridTemplateColumns = `repeat(${cfg.cols}, ${size}px)`;
    boardEl.style.gridTemplateRows = `repeat(${cfg.rows}, ${size}px)`;
    boardEl.innerHTML = '';

    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const el = document.createElement('div');
        el.className = 'cell cell--hidden';
        el.dataset.r = r;
        el.dataset.c = c;

        // Desktop
        el.addEventListener('click', () => handleClick(r, c));
        el.addEventListener('contextmenu', e => { e.preventDefault(); handleRightClick(r, c); });

        // Mobile long-press
        el.addEventListener('touchstart', e => {
          longPressTimer = setTimeout(() => {
            e.preventDefault();
            handleRightClick(r, c);
            longPressTimer = null;
          }, 400);
        }, { passive: false });
        el.addEventListener('touchend', () => { if (longPressTimer) clearTimeout(longPressTimer); });
        el.addEventListener('touchmove', () => { if (longPressTimer) clearTimeout(longPressTimer); });

        boardEl.appendChild(el);
      }
    }
  }

  function getCellEl(r, c) {
    return boardEl.children[r * cfg.cols + c];
  }

  function updateCellUI(r, c) {
    const cell = board[r][c];
    const el = getCellEl(r, c);
    el.className = 'cell';

    if (cell.revealed) {
      if (cell.mine) {
        el.classList.add('cell--mine');
        el.textContent = '💣';
      } else {
        el.classList.add('cell--revealed');
        if (cell.adj > 0) {
          el.textContent = cell.adj;
          el.classList.add(`n${cell.adj}`);
        } else {
          el.textContent = '';
        }
      }
    } else if (cell.flagged) {
      el.classList.add('cell--flagged');
      el.textContent = '🚩';
    } else {
      el.classList.add('cell--hidden');
      el.textContent = '';
    }
  }

  // ─── INTERACTIONS ────────────────────────
  function handleClick(r, c) {
    if (status === 'won' || status === 'lost') return;
    const cell = board[r][c];

    // Flag mode on mobile
    if (flagMode) { handleRightClick(r, c); return; }
    if (cell.flagged) return;

    // Chord click on revealed numbered cell
    if (cell.revealed && cell.adj > 0) {
      chordReveal(r, c);
      return;
    }

    if (cell.revealed) return;

    // First click → place mines
    if (!minesPlaced) {
      placeMines(r, c);
      status = 'playing';
      startTimer();
      smileyBtn.textContent = '🙂';
    }

    // Reveal
    if (cell.mine) {
      gameOver(false);
      return;
    }

    const before = countRevealed();
    floodReveal(r, c);
    const after = countRevealed();
    const revealed = after - before;

    // Sound based on how many cells revealed
    if (revealed > 5) SFX.revealBig();
    else SFX.reveal();

    checkWin();
  }

  function handleRightClick(r, c) {
    if (status === 'won' || status === 'lost') return;
    const cell = board[r][c];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    cell.flagged ? SFX.flag() : SFX.unflag();
    updateCellUI(r, c);
    updateFlagCount();
  }

  function countRevealed() {
    let n = 0;
    for (let r = 0; r < cfg.rows; r++)
      for (let c = 0; c < cfg.cols; c++)
        if (board[r][c].revealed) n++;
    return n;
  }

  function floodReveal(r, c) {
    const queue = [[r, c]];
    const visited = new Set();
    visited.add(`${r},${c}`);

    while (queue.length) {
      const [cr, cc] = queue.shift();
      const cell = board[cr][cc];
      if (cell.revealed || cell.flagged || cell.mine) continue;

      cell.revealed = true;
      updateCellUI(cr, cc);

      if (cell.adj === 0) {
        forNeighbors(cr, cc, (nr, nc) => {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) { visited.add(key); queue.push([nr, nc]); }
        });
      }
    }
  }

  function chordReveal(r, c) {
    const cell = board[r][c];
    let flagCount = 0;
    forNeighbors(r, c, (nr, nc) => { if (board[nr][nc].flagged) flagCount++; });

    if (flagCount !== cell.adj) return;

    let hitMine = false;
    forNeighbors(r, c, (nr, nc) => {
      const n = board[nr][nc];
      if (!n.revealed && !n.flagged) {
        if (n.mine) { hitMine = true; return; }
        floodReveal(nr, nc);
      }
    });

    if (hitMine) { gameOver(false); return; }
    SFX.reveal();
    checkWin();
  }

  // ─── WIN / LOSE ──────────────────────────
  function checkWin() {
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (!board[r][c].mine && !board[r][c].revealed) return;
      }
    }
    gameOver(true);
  }

  function gameOver(won) {
    status = won ? 'won' : 'lost';
    clearTimer();
    smileyBtn.textContent = won ? '😎' : '😵';

    // Sound
    if (won) SFX.win();
    else SFX.explode();

    // Record stats
    const stats = recordGame(won);

    // Reveal all mines
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const cell = board[r][c];
        if (cell.mine) {
          cell.revealed = true;
          updateCellUI(r, c);
        } else if (cell.flagged && !cell.mine) {
          const el = getCellEl(r, c);
          el.classList.add('cell--wrong-flag');
        }
      }
    }

    // Show modal after small delay
    setTimeout(() => showModal(won, stats), won ? 400 : 600);
  }

  // ─── MODAL ───────────────────────────────
  function showModal(won, stats) {
    modalBox.className = `modal ${won ? 'modal--win' : 'modal--lose'}`;
    $('modal-emoji').textContent = won ? '🏆' : '💥';
    $('modal-title').textContent = won ? 'You Win!' : 'Game Over!';
    $('modal-time').textContent = formatTime(time);
    $('modal-diff').textContent = cfg.label;

    // Best time & stats info
    const bestEl = $('modal-best');
    const statsEl = $('modal-stats-extra');
    const best = stats.bestTimes[difficulty];
    const winRate = getWinRate(difficulty);
    const played = stats.gamesPlayed[difficulty];

    if (won && best === time) {
      bestEl.innerHTML = '🎉 <strong>NEW BEST TIME!</strong>';
      bestEl.className = 'modal__best modal__best--new';
    } else if (best !== null) {
      bestEl.innerHTML = `Best: ${formatTime(best)}`;
      bestEl.className = 'modal__best';
    } else {
      bestEl.innerHTML = '';
    }

    statsEl.innerHTML = `${winRate}% win rate · ${played} games played`;

    // Confetti for win
    confettiBox.innerHTML = '';
    if (won) {
      const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
      for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = `${Math.random() * 100}%`;
        p.style.setProperty('--del', `${Math.random() * 2}s`);
        p.style.setProperty('--dur', `${2 + Math.random() * 2}s`);
        p.style.background = colors[i % colors.length];
        confettiBox.appendChild(p);
      }
    }

    modal.hidden = false;
  }

  function hideModal() {
    modal.hidden = true;
    confettiBox.innerHTML = '';
  }

  // ─── TIMER ───────────────────────────────
  function startTimer() {
    clearTimer();
    timerInterval = setInterval(() => { time++; updateTimer(); }, 1000);
  }
  function clearTimer() { clearInterval(timerInterval); timerInterval = null; }
  function updateTimer() { timerEl.textContent = formatTime(time); }
  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }

  // ─── BEST TIME DISPLAY ON GAME SCREEN ──
  function updateBestTimeDisplay() {
    const el = $('best-time');
    if (!el) return;
    const stats = getStats();
    const best = stats.bestTimes[difficulty];
    el.textContent = best !== null ? `🏆 Best: ${formatTime(best)}` : '';
  }

  // ─── FLAG COUNT ──────────────────────────
  function updateFlagCount() {
    let flags = 0;
    for (let r = 0; r < cfg.rows; r++)
      for (let c = 0; c < cfg.cols; c++)
        if (board[r][c].flagged) flags++;
    flagCountEl.textContent = cfg.mines - flags;
  }

  // ─── FLAG MODE (MOBILE) ──────────────────
  function toggleFlagMode() {
    flagMode = !flagMode;
    updateFlagModeUI();
  }
  function updateFlagModeUI() {
    const btn = $('btn-flag-mode');
    btn.classList.toggle('active', flagMode);
    $('flag-mode-icon').textContent = flagMode ? '🚩' : '👆';
    $('flag-mode-label').textContent = flagMode ? 'Flag Mode' : 'Reveal Mode';
  }

  // ─── BG PARTICLES ───────────────────────
  function generateParticles() {
    const container = $('bg-particles');
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.width = p.style.height = `${4 + Math.random() * 8}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.setProperty('--dur', `${4 + Math.random() * 6}s`);
      p.style.setProperty('--del', `${Math.random() * 5}s`);
      container.appendChild(p);
    }
  }

  // ─── BOOT ────────────────────────────────
  init();
})();
