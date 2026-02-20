/* Memory Match — Game Engine + SFX */
(() => {
  'use strict';
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) { const p = document.createElement('div'); p.classList.add('particle'); const s = Math.random()*4+2; p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`; pc.appendChild(p); }

  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click()  { playTone(600, 0.08, 'square', 0.08); },
    flip()   { playTone(700, 0.06, 'triangle', 0.08); },
    match()  { playTone(880, 0.1, 'sine', 0.12); setTimeout(()=>playTone(1100,0.08,'sine',0.1),60); },
    wrong()  { playTone(250, 0.15, 'square', 0.08); },
    win()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*120)); },
  };

  const EMOJIS = ['🎮','🎲','🎯','🏆','⭐','🔥','💎','🎪','🚀','🌈','🎵','🍕'];
  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const gridEl = $('grid'), movesEl = $('moves'), pairsEl = $('pairs'), bestEl = $('best');
  const overlay = $('overlay');
  overlay.classList.remove('active'); // ensure hidden on page load

  let cards, flipped, matched, moves, totalPairs, locked, best;
  best = parseInt(localStorage.getItem('memory_best') || '0');
  bestEl.textContent = best || '—';
  const savedSound = localStorage.getItem('memory_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('memory_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  function createGrid() {
    totalPairs = 8;
    const chosen = shuffle([...EMOJIS]).slice(0, totalPairs);
    cards = shuffle([...chosen, ...chosen]);
    flipped = []; matched = new Set(); moves = 0; locked = false;
    movesEl.textContent = 0; pairsEl.textContent = `0/${totalPairs}`;
    gridEl.innerHTML = '';
    cards.forEach((emoji, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div class="card__inner"><div class="card__face card__front">❓</div><div class="card__face card__back">${emoji}</div></div>`;
      card.addEventListener('click', () => flipCard(i, card));
      gridEl.appendChild(card);
    });
  }

  function flipCard(idx, el) {
    if (locked || matched.has(idx) || flipped.find(f => f.idx === idx)) return;
    el.classList.add('flipped');
    SFX.flip();
    flipped.push({ idx, el, emoji: cards[idx] });
    if (flipped.length === 2) {
      moves++; movesEl.textContent = moves;
      locked = true;
      const [a, b] = flipped;
      if (a.emoji === b.emoji) {
        matched.add(a.idx); matched.add(b.idx);
        setTimeout(() => { a.el.classList.add('matched'); b.el.classList.add('matched'); }, 300);
        SFX.match();
        pairsEl.textContent = `${matched.size/2}/${totalPairs}`;
        if (matched.size === cards.length) setTimeout(gameWin, 500);
        flipped = []; locked = false;
      } else {
        SFX.wrong();
        setTimeout(() => { a.el.classList.remove('flipped'); b.el.classList.remove('flipped'); flipped = []; locked = false; }, 800);
      }
    }
  }

  function gameWin() {
    if (!best || moves < best) { best = moves; localStorage.setItem('memory_best', String(best)); bestEl.textContent = best; }
    SFX.win();
    $('ov-emoji').textContent = '🎉'; $('ov-title').textContent = 'You Win!';
    $('ov-msg').textContent = `Completed in ${moves} moves | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame() { overlay.classList.remove('active'); createGrid(); }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    createGrid();
    $('ov-emoji').textContent = '🃏'; $('ov-title').textContent = 'Ready?';
    $('ov-msg').textContent = 'Find all matching pairs!';
    overlay.classList.add('active');
  }

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', () => { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', showGameScreen);
  $('btn-sound').addEventListener('click', toggleSound);
})();
