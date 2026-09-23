/* Whack-a-Mole — Game Engine + SFX */
(() => {
  'use strict';

  const HOLES = 9;
  const ROUND_TIME = 30;
  const MAX_ACTIVE = 3;

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
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click() { playTone(600, 0.08, 'square', 0.08); },
    hit()   { playTone(700, 0.08, 'square', 0.1); setTimeout(()=>playTone(950,0.06,'square',0.08),40); },
    bomb()  { playTone(160, 0.25, 'sawtooth', 0.14); },
    tick()  { playTone(1000, 0.03, 'sine', 0.05); },
    over()  { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  // ─── DOM ─────────────────────────────────
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const appEl = $('app'), boardEl = $('board');
  const scoreEl = $('score'), timerEl = $('timer'), bestEl = $('best');
  const overlay = $('overlay');
  overlay.classList.remove('active'); // ensure hidden on page load

  let score, best, streak, timer, timerInterval, running, spawnTimer;
  let holes = []; // {el, critterEl, active, type, hideTimer}

  best = parseInt(localStorage.getItem('whackamole_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('whackamole_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') stopRound();
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('whackamole_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  // ─── BOARD BUILD ─────────────────────────
  function buildBoard() {
    boardEl.innerHTML = '';
    holes = [];
    for (let i = 0; i < HOLES; i++) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.i = i;
      const critter = document.createElement('span');
      critter.className = 'critter';
      hole.appendChild(critter);
      hole.addEventListener('click', () => whack(i));
      boardEl.appendChild(hole);
      holes.push({ el: hole, critterEl: critter, active: false, type: null, hideTimer: null });
    }
  }

  // ─── DIFFICULTY RAMP ─────────────────────
  function difficultyFraction() {
    const elapsed = ROUND_TIME - timer;
    return Math.max(0, Math.min(1, elapsed / ROUND_TIME));
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ─── SPAWN LOOP ──────────────────────────
  function scheduleSpawn() {
    const f = difficultyFraction();
    const delay = lerp(750, 380, f) + Math.random() * lerp(300, 150, f);
    spawnTimer = setTimeout(() => {
      if (!running) return;
      spawnOne();
      scheduleSpawn();
    }, delay);
  }

  function spawnOne() {
    const activeCount = holes.filter(h => h.active).length;
    if (activeCount >= MAX_ACTIVE) return;
    const empty = holes.map((h, i) => h.active ? -1 : i).filter(i => i !== -1);
    if (!empty.length) return;

    const i = empty[Math.floor(Math.random() * empty.length)];
    const f = difficultyFraction();
    const bombChance = lerp(0.14, 0.3, f);
    const type = Math.random() < bombChance ? 'bomb' : 'mole';
    const showDuration = lerp(1000, 550, f);

    const h = holes[i];
    h.active = true;
    h.type = type;
    h.critterEl.textContent = type === 'mole' ? '🐹' : '💣';
    h.el.classList.add('active', type === 'mole' ? 'mole' : 'bombhole');

    h.hideTimer = setTimeout(() => hide(i), showDuration);
  }

  function hide(i) {
    const h = holes[i];
    if (!h.active) return;
    h.active = false;
    h.el.classList.remove('active', 'mole', 'bombhole', 'hit');
    if (h.hideTimer) { clearTimeout(h.hideTimer); h.hideTimer = null; }
  }

  function whack(i) {
    if (!running) return;
    const h = holes[i];
    if (!h.active) return;
    const type = h.type;

    if (h.hideTimer) { clearTimeout(h.hideTimer); h.hideTimer = null; }
    h.el.classList.add('hit');

    if (type === 'mole') {
      const gain = 10 + streak * 2;
      score += gain; streak++;
      scoreEl.textContent = score;
      showPopup(h.el, `+${gain}`, 'good');
      SFX.hit();
    } else {
      score = Math.max(0, score - 15);
      streak = 0;
      scoreEl.textContent = score;
      showPopup(h.el, '-15', 'bad');
      SFX.bomb();
      appEl.classList.remove('shake'); void appEl.offsetWidth; appEl.classList.add('shake');
    }

    setTimeout(() => hide(i), 130);
  }

  function showPopup(holeEl, text, cls) {
    const p = document.createElement('div');
    p.className = 'popup ' + cls;
    p.textContent = text;
    holeEl.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }

  // ─── TIMER ───────────────────────────────
  function startTimer() {
    timer = ROUND_TIME;
    timerEl.textContent = timer;
    timerInterval = setInterval(() => {
      timer--;
      timerEl.textContent = timer;
      if (timer <= 5 && timer > 0) SFX.tick();
      if (timer <= 0) { clearInterval(timerInterval); endRound(); }
    }, 1000);
  }

  function stopRound() {
    running = false;
    clearInterval(timerInterval);
    clearTimeout(spawnTimer);
    holes.forEach((h, i) => hide(i));
  }

  function endRound() {
    stopRound();
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('whackamole_best', String(best)); }
    SFX.over();
    $('ov-emoji').textContent = '🏆';
    $('ov-title').textContent = "Time's Up!";
    $('ov-msg').textContent = `Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startRound() {
    overlay.classList.remove('active');
    score = 0; streak = 0;
    scoreEl.textContent = 0;
    running = true;
    startTimer();
    scheduleSpawn();
  }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    stopRound();
    buildBoard();
    score = 0; scoreEl.textContent = 0; timerEl.textContent = String(ROUND_TIME);
    $('ov-emoji').textContent = '🔨'; $('ov-title').textContent = 'Ready?';
    $('ov-msg').textContent = `Whack as many moles as you can in ${ROUND_TIME}s!`;
    overlay.classList.add('active'); running = false;
  }

  // ─── EVENTS ─────────────────────────────
  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startRound);
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', () => { showGameScreen(); });
  $('btn-sound').addEventListener('click', toggleSound);
})();
