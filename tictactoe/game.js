/* Tic Tac Toe — Game Engine + Home Screen + SFX */
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
    placeX() { playTone(440, 0.12, 'triangle', 0.12); },
    placeO() { playTone(520, 0.12, 'triangle', 0.12); },
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
  let stats = JSON.parse(localStorage.getItem('ttt_stats') || '{"x":0,"o":0,"d":0}');

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
  }

  // ─── SOUND TOGGLE ────────────────────────
  const savedSound = localStorage.getItem('ttt_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('ttt_sound', soundEnabled ? 'on' : 'off');
    updateSoundUI();
    if (soundEnabled) SFX.click();
  }

  function updateSoundUI() {
    const btn = $('btn-sound');
    btn.textContent = soundEnabled ? '🔊' : '🔇';
  }

  // ─── SCORE DISPLAY ──────────────────────
  function updateScores() {
    $('x-wins').textContent = stats.x;
    $('o-wins').textContent = stats.o;
    $('draws').textContent = stats.d;
  }

  // ─── GAME LOGIC ─────────────────────────
  const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function init() {
    clearTimeout(aiTimer);
    aiTimer = null;
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameOver = false;
    statusEl.textContent = "X's turn";
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.addEventListener('click', () => handleCell(i));
      boardEl.appendChild(cell);
    }
    updateScores();
  }

  function handleCell(i) {
    if (gameOver || board[i]) return;
    if (vsAI && currentPlayer === 'O') return;

    makeMove(i);
    if (!gameOver && vsAI && currentPlayer === 'O') {
      aiTimer = setTimeout(() => { aiTimer = null; makeMove(bestMove()); }, 350);
    }
  }

  function makeMove(i) {
    board[i] = currentPlayer;
    const cell = boardEl.children[i];
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer.toLowerCase());

    currentPlayer === 'X' ? SFX.placeX() : SFX.placeO();

    const win = checkWin();
    if (win) {
      gameOver = true;
      statusEl.textContent = `🎉 ${currentPlayer} Wins!`;
      win.forEach(idx => boardEl.children[idx].classList.add('win-cell'));
      if (currentPlayer === 'X') { stats.x++; SFX.win(); }
      else { stats.o++; if (vsAI) SFX.lose(); else SFX.win(); }
      localStorage.setItem('ttt_stats', JSON.stringify(stats));
      updateScores();
      return;
    }

    if (board.every(c => c)) {
      gameOver = true;
      statusEl.textContent = "🤝 It's a Draw!";
      stats.d++;
      localStorage.setItem('ttt_stats', JSON.stringify(stats));
      updateScores();
      SFX.draw();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusEl.textContent = `${currentPlayer}'s turn`;
  }

  function checkWin() {
    for (const [a,b,c] of WINS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return [a,b,c];
    }
    return null;
  }

  // ─── MINIMAX AI ─────────────────────────
  function minimax(bd, isMax, depth) {
    for (const [a,b,c] of WINS) {
      if (bd[a] && bd[a]===bd[b] && bd[a]===bd[c]) return bd[a]==='O' ? 10-depth : depth-10;
    }
    if (bd.every(c=>c)) return 0;
    let best = isMax ? -Infinity : Infinity;
    for (let i=0;i<9;i++) {
      if (bd[i]) continue;
      bd[i] = isMax ? 'O' : 'X';
      const val = minimax(bd, !isMax, depth+1);
      bd[i] = null;
      best = isMax ? Math.max(best, val) : Math.min(best, val);
    }
    return best;
  }

  function bestMove() {
    let best = -Infinity, move = 0;
    for (let i=0;i<9;i++) {
      if (board[i]) continue;
      board[i] = 'O';
      const val = minimax(board, false, 0);
      board[i] = null;
      if (val > best) { best = val; move = i; }
    }
    return move;
  }

  // ─── EVENTS ─────────────────────────────
  $('btn-play-ai').addEventListener('click', () => { SFX.click(); vsAI = true; showScreen('game'); init(); });
  $('btn-play-pvp').addEventListener('click', () => { SFX.click(); vsAI = false; showScreen('game'); init(); });
  $('btn-back').addEventListener('click', () => { SFX.click(); clearTimeout(aiTimer); aiTimer = null; showScreen('home'); });
  $('btn-new').addEventListener('click', () => { SFX.click(); init(); });
  $('btn-sound').addEventListener('click', toggleSound);

  updateScores();
})();
