/* Wordle — Game Engine + Home Screen + SFX */
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
    type()  { playTone(400+Math.random()*200, 0.05, 'square', 0.06); },
    del()   { playTone(300, 0.06, 'triangle', 0.06); },
    correct(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*100)); },
    wrong() { playTone(250, 0.15, 'square', 0.1); },
    win()   { [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>playTone(f,0.3,'sine',0.12),i*100)); },
    lose()  { [400,350,300,250].forEach((f,i)=>setTimeout(()=>playTone(f,0.25,'sine',0.1),i*120)); },
  };

  const $ = id => document.getElementById(id);
  const screenHome = $('screen-home'), screenGame = $('screen-game');
  const gridEl = $('grid'), kbEl = $('keyboard'), statusEl = $('status');
  const streakEl = $('streak'), bestEl = $('best');

  // ─── WORD LIST ──────────────────────────
  const WORDS = ['ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN','AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIEN','ALIGN','ALIVE','ALLEY','ALLOW','ALONE','ALTER','ANGEL','ANGER','ANGLE','ANGRY','ANKLE','APART','APPLE','ARENA','ARGUE','ARISE','ASIDE','ASSET','AVOID','AWARD','AWARE','BADLY','BAKER','BASED','BASIC','BASIS','BEACH','BEGAN','BEGIN','BEING','BELOW','BENCH','BIBLE','BLACK','BLADE','BLAME','BLANK','BLAST','BLAZE','BLEED','BLEND','BLIND','BLOCK','BLOOD','BLOWN','BOARD','BONUS','BOUND','BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED','BRICK','BRIEF','BRING','BROAD','BROKE','BROWN','BRUSH','BUILD','BUILT','BUNCH','BURST','BUYER','CABIN','CABLE','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHASE','CHEAP','CHECK','CHEEK','CHESS','CHEST','CHIEF','CHILD','CHINA','CHUNK','CHUNK','CIVIL','CLAIM','CLASS','CLEAN','CLEAR','CLIMB','CLING','CLOCK','CLOSE','CLOUD','COACH','COAST','COLOR','COUCH','COULD','COUNT','COURT','COVER','CRACK','CRAFT','CRASH','CRAZY','CREAM','CRIME','CROSS','CROWD','CRUEL','CRUSH','CURVE','CYCLE','DAILY','DANCE','DEALT','DEATH','DEBUT','DELAY','DEPTH','DEVIL','DIRTY','DOUBT','DOZEN','DRAFT','DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIED','DRINK','DRIVE','DROVE','DYING','EAGER','EARLY','EARTH','EIGHT','ELECT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','ENTRY','EQUAL','ERROR','EVENT','EVERY','EXACT','EXIST','EXTRA','FAITH','FALSE','FAULT','FEAST','FIELD','FIFTH','FIFTY','FIGHT','FINAL','FIRST','FIXED','FLAME','FLASH','FLEET','FLESH','FLOAT','FLOOD','FLOOR','FLUID','FLESH','FOCUS','FORCE','FORGE','FORTH','FORTY','FORUM','FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY','GIANT','GIVEN','GLASS','GLIDE','GLOBE','GLORY','GOING','GRACE','GRADE','GRAIN','GRAND','GRANT','GRAPH','GRASP','GRASS','GRAVE','GREAT','GREEN','GRIEF','GRILL','GRIND','GROSS','GROUP','GROWN','GUARD','GUESS','GUEST','GUIDE','GUILT','HAPPY','HARSH','HAUNT','HEART','HEAVY','HEDGE','HELLO','HENCE','HORSE','HOTEL','HOUSE','HUMAN','HUMOR','IDEAL','IMAGE','IMPLY','INDEX','FAITH','INNER','INPUT','IRONY','ISSUE','IVORY','JOINT','JUDGE','JUICE','JUICY','KNACK','KNEEL','KNIFE','KNOCK','KNOWN','LABEL','LABOR','LARGE','LASER','LATER','LAUGH','LAYER','LEARN','LEASE','LEAVE','LEGAL','LEVEL','LIGHT','LIMIT','LINEN','LIVER','LOGIC','LONELY','LOOSE','LOVER','LOWER','LOYAL','LUCKY','LUNCH','LYING','MAGIC','MAJOR','MAKER','MARCH','MARRY','MATCH','MAYBE','MAYOR','MEDIA','MERCY','MERIT','METAL','MINOR','MINUS','MIXER','MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVED','MOVIE','MUSIC','NAKED','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH','NOTED','NOVEL','NURSE','OCCUR','OCEAN','OFFER','OFTEN','ORDER','OTHER','OUTER','OWNER','PAINT','PANEL','PANIC','PAPER','PARTY','PATCH','PAUSE','PEACE','PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT','PITCH','PIZZA','PLACE','PLAIN','PLANE','PLANT','PLATE','PLEAD','PLAZA','PLEAD','POINT','POUND','POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROOF','PROUD','PROVE','PUNCH','PUPIL','QUEEN','QUEST','QUEUE','QUICK','QUIET','QUITE','QUOTE','RADAR','RADIO','RAISE','RALLY','RANCH','RANGE','RAPID','RATIO','REACH','REACT','READY','REALM','REBEL','REIGN','RELAX','REPLY','RIGHT','RIGID','RIVAL','RIVER','ROBOT','ROCKY','ROGER','ROMAN','ROUGH','ROUND','ROUTE','ROYAL','RUGBY','RURAL','SADLY','SAINT','SALAD','SAUCE','SCALE','SCENE','SCOPE','SCORE','SENSE','SERVE','SEVEN','SHALL','SHAME','SHAPE','SHARE','SHARP','SHEEP','SHEER','SHELF','SHELL','SHIFT','SHINE','SHIRT','SHOCK','SHOOT','SHORT','SHOUT','SIGHT','SINCE','SIXTH','SIXTY','SIZED','SKILL','SKULL','SLAVE','SLEEP','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL','SMILE','SMOKE','SOLID','SOLVE','SORRY','SOUTH','SPACE','SPARE','SPEAK','SPEED','SPEND','SPENT','SPINE','SPITE','SPLIT','SPOKE','SPOON','SPORT','SPRAY','SQUAD','STACK','STAFF','STAGE','STAKE','STALE','STALL','STAND','STARK','START','STATE','STEAK','STEAL','STEAM','STEEL','STEEP','STEER','STICK','STIFF','STILL','STOCK','STONE','STOOD','STORE','STORM','STORY','STOVE','STRAP','STRAW','STRIP','STUCK','STUDY','STUFF','STYLE','SUGAR','SUITE','SUNNY','SUPER','SURGE','SWAMP','SWEAR','SWEEP','SWEET','SWEPT','SWIFT','SWING','SWORD','SWORE','SWORN','TAKEN','TASTE','TEACH','TEETH','THANK','THEFT','THEME','THERE','THICK','THING','THINK','THIRD','THOSE','THREE','THREW','THROW','THUMB','TIGHT','TIMER','TIRED','TITLE','TODAY','TOKEN','TOTAL','TOUCH','TOUGH','TOWER','TOXIC','TRACE','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TRAPS','TRASH','TREAT','TREND','TRIAL','TRIBE','TRICK','TRIED','TROOP','TRUCK','TRULY','TRUMP','TRUNK','TRUST','TRUTH','TUMOR','TWICE','TWIST','ULTRA','UNDER','UNIFY','UNION','UNITE','UNITY','UNTIL','UPPER','UPSET','URBAN','USAGE','USUAL','VALID','VALUE','VIDEO','VIGOR','VIRAL','VIRUS','VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER','WASTE','WATCH','WATER','WEIGH','WEIRD','WHALE','WHEAT','WHEEL','WHERE','WHICH','WHILE','WHITE','WHOLE','WHOSE','WIDER','WOMAN','WOMEN','WORLD','WORRY','WORSE','WORST','WORTH','WOULD','WOUND','WRITE','WRONG','WROTE','YACHT','YIELD','YOUNG','YOUTH'];

  let answer, guesses, currentGuess, currentRow, gameOverFlag;
  let stats = JSON.parse(localStorage.getItem('wordle_stats') || '{"streak":0,"best":0}');

  const savedSound = localStorage.getItem('wordle_sound');
  soundEnabled = savedSound !== 'off';
  updateSoundUI();

  function showScreen(name) {
    screenHome.classList.toggle('screen--active', name === 'home');
    screenGame.classList.toggle('screen--active', name === 'game');
  }
  function toggleSound() { soundEnabled = !soundEnabled; localStorage.setItem('wordle_sound', soundEnabled?'on':'off'); updateSoundUI(); if(soundEnabled)SFX.click(); }
  function updateSoundUI() { $('btn-sound').textContent = soundEnabled ? '🔊' : '🔇'; }

  function init() {
    answer = WORDS[Math.floor(Math.random()*WORDS.length)];
    guesses = []; currentGuess = ''; currentRow = 0; gameOverFlag = false;
    statusEl.textContent = '';
    streakEl.textContent = stats.streak;
    bestEl.textContent = stats.best;
    buildGrid(); buildKeyboard();
  }

  function buildGrid() {
    gridEl.innerHTML = '';
    for (let r=0;r<6;r++) {
      const row = document.createElement('div'); row.classList.add('grid-row');
      for (let c=0;c<5;c++) { const cell = document.createElement('div'); cell.classList.add('grid-cell'); row.appendChild(cell); }
      gridEl.appendChild(row);
    }
  }

  const ROWS_KEYS = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  const keyStates = {};

  function buildKeyboard() {
    kbEl.innerHTML = '';
    Object.keys(keyStates).forEach(k=>delete keyStates[k]);
    ROWS_KEYS.forEach((row,ri)=>{
      const kr = document.createElement('div'); kr.classList.add('kb-row');
      if (ri===2) {
        const enter = document.createElement('button'); enter.classList.add('key','wide'); enter.textContent='Enter';
        enter.addEventListener('click', submitGuess); kr.appendChild(enter);
      }
      for (const ch of row) {
        const k = document.createElement('button'); k.classList.add('key'); k.textContent=ch; k.dataset.key=ch;
        k.addEventListener('click', ()=>typeLetter(ch)); kr.appendChild(k);
      }
      if (ri===2) {
        const del = document.createElement('button'); del.classList.add('key','wide'); del.textContent='⌫';
        del.addEventListener('click', deleteLetter); kr.appendChild(del);
      }
      kbEl.appendChild(kr);
    });
  }

  function typeLetter(ch) {
    if (gameOverFlag || currentGuess.length >= 5) return;
    currentGuess += ch;
    updateRow();
    SFX.type();
  }

  function deleteLetter() {
    if (gameOverFlag || currentGuess.length === 0) return;
    currentGuess = currentGuess.slice(0,-1);
    updateRow();
    SFX.del();
  }

  function updateRow() {
    const row = gridEl.children[currentRow];
    for (let i=0;i<5;i++) {
      const cell = row.children[i];
      cell.textContent = currentGuess[i] || '';
      cell.classList.toggle('filled', !!currentGuess[i]);
    }
  }

  function submitGuess() {
    if (gameOverFlag) return;
    if (currentGuess.length !== 5) { statusEl.textContent = 'Need 5 letters!'; SFX.wrong(); return; }

    const row = gridEl.children[currentRow];
    const result = evaluateGuess(currentGuess, answer);

    result.forEach((state, i) => {
      setTimeout(() => {
        const cell = row.children[i];
        cell.classList.add(state);
        const ch = currentGuess[i];
        const key = kbEl.querySelector(`[data-key="${ch}"]`);
        if (key) {
          if (state==='correct') key.className='key correct';
          else if (state==='present' && !key.classList.contains('correct')) key.className='key present';
          else if (state==='absent' && !key.classList.contains('correct') && !key.classList.contains('present')) key.className='key absent';
        }
      }, i * 300);
    });

    setTimeout(() => {
      if (currentGuess === answer) {
        statusEl.textContent = '🎉 You got it!';
        stats.streak++; if(stats.streak>stats.best)stats.best=stats.streak;
        localStorage.setItem('wordle_stats',JSON.stringify(stats));
        streakEl.textContent=stats.streak;bestEl.textContent=stats.best;
        gameOverFlag = true; SFX.win();
        return;
      }

      guesses.push(currentGuess);
      currentGuess = ''; currentRow++;

      if (currentRow >= 6) {
        statusEl.textContent = `💀 It was: ${answer}`;
        stats.streak=0; localStorage.setItem('wordle_stats',JSON.stringify(stats));
        streakEl.textContent=0;
        gameOverFlag = true; SFX.lose();
      } else {
        SFX.correct();
      }
    }, 5 * 300 + 100);
  }

  function evaluateGuess(guess, ans) {
    const result = Array(5).fill('absent');
    const ansArr = ans.split('');
    const guessArr = guess.split('');

    // Correct first
    guessArr.forEach((ch,i) => { if(ch===ansArr[i]){result[i]='correct';ansArr[i]=null;guessArr[i]=null;} });
    // Present
    guessArr.forEach((ch,i) => { if(!ch)return; const idx=ansArr.indexOf(ch); if(idx>-1){result[i]='present';ansArr[idx]=null;} });
    return result;
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    if (gameOverFlag) return;
    if (e.key === 'Enter') submitGuess();
    else if (e.key === 'Backspace') deleteLetter();
    else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
  });

  $('btn-home-play').addEventListener('click', ()=> { SFX.click(); showScreen('game'); init(); });
  $('btn-back').addEventListener('click', ()=> { SFX.click(); showScreen('home'); });
  $('btn-new').addEventListener('click', ()=> { SFX.click(); init(); });
  $('btn-sound').addEventListener('click', toggleSound);
})();
