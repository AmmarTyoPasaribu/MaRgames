/* Typing Speed — Game Engine + SFX */
(() => {
  'use strict';
  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) { const p = document.createElement('div'); p.classList.add('particle'); const s = Math.random()*4+2; p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`; pc.appendChild(p); }

  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click()   { playTone(600, 0.08, 'square', 0.08); },
    key()     { playTone(800+Math.random()*200, 0.03, 'sine', 0.04); },
    correct() { playTone(880, 0.1, 'sine', 0.12); },
    wrong()   { playTone(200, 0.15, 'square', 0.08); },
    over()    { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const WORDS = ['the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us','great','big','high','old','right','too','long','best','had','keep','word','help','line','turn','move','live','found','city','each','play','small','end','read','hand','run','close','open','sure','home','next','hard','face','both','mark','side','game','made','still','point','kind','name','world','head','need','much','start','place','four','group','real','part','story'];

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const wpmEl = $('wpm'), timerEl = $('timer'), bestEl = $('best');
  const wordsEl = $('words'), inputEl = $('type-input'), accuracyEl = $('accuracy');
  const overlay = $('overlay');
  overlay.classList.remove('active'); // ensure hidden on page load

  let wordList, currentIdx, correctCount, wrongCount, best, timer, interval, running, started;
  best = parseInt(localStorage.getItem('typing_best') || '0');
  bestEl.textContent = best;
  const savedSound = localStorage.getItem('typing_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { running = false; clearInterval(interval); }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('typing_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function genWords(n) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(WORDS[Math.floor(Math.random()*WORDS.length)]);
    return arr;
  }

  function renderWords() {
    wordsEl.innerHTML = '';
    wordList.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'word' + (i === currentIdx ? ' active' : '');
      span.textContent = w;
      wordsEl.appendChild(span);
    });
  }

  function updateStats() {
    const elapsed = 30 - timer;
    const wpm = elapsed > 0 ? Math.round((correctCount / elapsed) * 60) : 0;
    wpmEl.textContent = wpm;
    const total = correctCount + wrongCount;
    const acc = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    accuracyEl.textContent = total > 0 ? `🎯 ${acc}% accuracy` : '';
  }

  function startTimer() {
    timer = 30; timerEl.textContent = timer;
    interval = setInterval(() => {
      timer--;
      timerEl.textContent = timer;
      if (timer <= 0) { clearInterval(interval); gameOver(); }
    }, 1000);
  }

  function gameOver() {
    running = false; inputEl.disabled = true;
    const wpm = Math.round((correctCount / 30) * 60);
    if (wpm > best) { best = wpm; bestEl.textContent = best; localStorage.setItem('typing_best', String(best)); }
    SFX.over();
    $('ov-emoji').textContent = '🏆'; $('ov-title').textContent = 'Time\'s Up!';
    const total = correctCount + wrongCount;
    const acc = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    $('ov-msg').textContent = `${wpm} WPM | ${acc}% accuracy | Best: ${best} WPM`;
    overlay.classList.add('active');
  }

  function startGame() {
    overlay.classList.remove('active');
    wordList = genWords(60); currentIdx = 0;
    correctCount = 0; wrongCount = 0;
    running = true; started = false;
    inputEl.disabled = false; inputEl.value = ''; inputEl.focus();
    renderWords(); updateStats();
  }

  inputEl.addEventListener('input', () => {
    if (!running) return;
    if (!started) { started = true; startTimer(); }
    SFX.key();
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!running || currentIdx >= wordList.length) return;
      const typed = inputEl.value.trim();
      const wordSpans = wordsEl.querySelectorAll('.word');
      if (typed === wordList[currentIdx]) {
        correctCount++;
        wordSpans[currentIdx].classList.add('correct');
        SFX.correct();
      } else {
        wrongCount++;
        wordSpans[currentIdx].classList.add('wrong');
        SFX.wrong();
      }
      currentIdx++;
      if (currentIdx < wordList.length) {
        wordSpans[currentIdx].classList.add('active');
      } else {
        wordList.push(...genWords(20));
        renderWords();
      }
      inputEl.value = '';
      updateStats();
    }
  });

  function showGameScreen() {
    SFX.click(); showScreen('game');
    wordList = genWords(60); currentIdx = 0; correctCount = 0; wrongCount = 0;
    wpmEl.textContent = 0; timerEl.textContent = '30'; accuracyEl.textContent = '';
    inputEl.disabled = true; inputEl.value = '';
    renderWords();
    $('ov-emoji').textContent = '⌨️'; $('ov-title').textContent = 'Ready?';
    $('ov-msg').textContent = 'Type as fast as you can!';
    overlay.classList.add('active'); running = false;
  }

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', () => { SFX.click(); clearInterval(interval); showScreen('home'); });
  $('btn-new').addEventListener('click', () => { clearInterval(interval); showGameScreen(); });
  $('btn-sound').addEventListener('click', toggleSound);
})();
