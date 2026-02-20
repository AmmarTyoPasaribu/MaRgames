/* Math Quiz — Game Engine + SFX */
(() => {
  'use strict';

  const pc = document.getElementById('bg-particles');
  for (let i = 0; i < 25; i++) { const p = document.createElement('div'); p.classList.add('particle'); const s = Math.random()*4+2; p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${Math.random()*6+4}s;--del:${Math.random()*5}s`; pc.appendChild(p); }

  let audioCtx = null, soundEnabled = true;
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
  function playTone(f,d,t='sine',v=0.15){ if(!soundEnabled)return; try{const c=getAudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+d);}catch(e){} }
  const SFX = {
    click()   { playTone(600, 0.08, 'square', 0.08); },
    correct() { playTone(880, 0.1, 'sine', 0.12); setTimeout(()=>playTone(1100,0.08,'sine',0.1),60); },
    wrong()   { playTone(200, 0.2, 'square', 0.1); },
    tick()    { playTone(1000, 0.03, 'sine', 0.05); },
    over()    { [400,350,300,200].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const scoreEl = $('score'), timerEl = $('timer'), bestEl = $('best');
  const questionEl = $('question'), answersEl = $('answers'), streakEl = $('streak');
  const overlay = $('overlay');
  overlay.classList.remove('active'); // ensure hidden on page load

  let score, best, timer, interval, streak, running;
  best = parseInt(localStorage.getItem('mathquiz_best') || '0');
  bestEl.textContent = best;

  const savedSound = localStorage.getItem('mathquiz_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
    if (name === 'home') { running = false; clearInterval(interval); }
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('mathquiz_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled) SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function genQuestion() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;
    if (op === '+') { a = Math.floor(Math.random()*50)+1; b = Math.floor(Math.random()*50)+1; answer = a+b; }
    else if (op === '-') { a = Math.floor(Math.random()*50)+10; b = Math.floor(Math.random()*a)+1; answer = a-b; }
    else { a = Math.floor(Math.random()*12)+2; b = Math.floor(Math.random()*12)+2; answer = a*b; }
    return { text: `${a} ${op} ${b} = ?`, answer };
  }

  function showQuestion() {
    const q = genQuestion();
    questionEl.textContent = q.text;
    questionEl.classList.remove('correct', 'wrong');
    const choices = [q.answer];
    while (choices.length < 4) {
      const offset = Math.floor(Math.random()*10)-5;
      const wrong = q.answer + (offset === 0 ? (Math.random()>0.5?1:-1) : offset);
      if (!choices.includes(wrong) && wrong >= 0) choices.push(wrong);
    }
    choices.sort(() => Math.random() - 0.5);
    answersEl.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = c;
      btn.addEventListener('click', () => {
        if (!running) return;
        if (c === q.answer) {
          score += 10 + streak * 2;
          streak++;
          scoreEl.textContent = score;
          streakEl.textContent = streak > 1 ? `🔥 ${streak} streak!` : '';
          questionEl.classList.add('correct');
          SFX.correct();
        } else {
          streak = 0;
          streakEl.textContent = '';
          questionEl.classList.add('wrong');
          SFX.wrong();
        }
        setTimeout(showQuestion, 300);
      });
      answersEl.appendChild(btn);
    });
  }

  function startTimer() {
    timer = 60;
    timerEl.textContent = timer;
    interval = setInterval(() => {
      timer--;
      timerEl.textContent = timer;
      if (timer <= 10) SFX.tick();
      if (timer <= 0) { clearInterval(interval); gameOver(); }
    }, 1000);
  }

  function gameOver() {
    running = false;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('mathquiz_best', String(best)); }
    SFX.over();
    $('ov-emoji').textContent = '🏆';
    $('ov-title').textContent = 'Time\'s Up!';
    $('ov-msg').textContent = `Score: ${score} | Best: ${best}`;
    overlay.classList.add('active');
  }

  function startGame() {
    overlay.classList.remove('active');
    score = 0; streak = 0;
    scoreEl.textContent = 0; streakEl.textContent = '';
    running = true;
    showQuestion();
    startTimer();
  }

  function showGameScreen() {
    SFX.click(); showScreen('game');
    score = 0; scoreEl.textContent = 0; timerEl.textContent = '60'; streakEl.textContent = '';
    answersEl.innerHTML = '';
    questionEl.textContent = 'Ready?';
    $('ov-emoji').textContent = '🧮'; $('ov-title').textContent = 'Ready?';
    $('ov-msg').textContent = 'Answer as many as you can in 60s!';
    overlay.classList.add('active'); running = false;
  }

  $('btn-home-play').addEventListener('click', showGameScreen);
  $('btn-start').addEventListener('click', startGame);
  $('btn-back').addEventListener('click', () => { SFX.click(); clearInterval(interval); showScreen('home'); });
  $('btn-new').addEventListener('click', () => { clearInterval(interval); showGameScreen(); });
  $('btn-sound').addEventListener('click', toggleSound);
})();
