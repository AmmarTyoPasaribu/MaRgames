/* =============================================
   MaRgames Dashboard — Script
   Particles + Scores + Theme + Thumbnails + Transitions
   ============================================= */

// --- Theme Toggle ---
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const saved = localStorage.getItem('margames_theme') || 'dark';
  html.dataset.theme = saved;
  toggle.textContent = saved === 'dark' ? '🌙' : '☀️';

  toggle.addEventListener('click', () => {
    const current = html.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    toggle.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('margames_theme', next);
  });
})();

// --- Page Transitions ---
(function initTransitions() {
  const overlay = document.getElementById('page-transition');
  document.querySelectorAll('[data-transition]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      overlay.classList.add('active');
      setTimeout(() => { window.location.href = href; }, 350);
    });
  });
  // Fade in on load
  window.addEventListener('pageshow', () => {
    overlay.classList.remove('active');
  });
})();

// --- Particle Background ---
(function createParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
  const count = 35;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 4 + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.setProperty('--dur', (Math.random() * 6 + 4) + 's');
    p.style.setProperty('--del', (Math.random() * 5) + 's');
    const colors = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ec4899','#22c55e'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(p);
  }
})();

// --- Load Best Scores from LocalStorage ---
(function loadScores() {
  const scoreKeys = {
    minesweeper: { key: 'minesweeper_best_easy', label: 'Best: ' },
    tictactoe:   { key: 'ttt_stats', label: 'Wins: ', parse: v => { try { const s = JSON.parse(v); return s.x || 0; } catch { return null; } } },
    snake:       { key: 'snake_best', label: 'Best: ' },
    tetris:      { key: 'tetris_best', label: 'Best: ' },
    flappybird:  { key: 'flappy_best', label: 'Best: ' },
    '2048':      { key: '2048_best', label: 'Best: ' },
    sudoku:      { key: 'sudoku_best_easy', label: 'Best: ' },
    wordle:      { key: 'wordle_stats', label: 'Streak: ', parse: v => { try { const s = JSON.parse(v); return s.streak || 0; } catch { return null; } } },
    breakout:    { key: 'breakout_best', label: 'Best: ' },
    mathquiz:    { key: 'mathquiz_best', label: 'Best: ' },
    typingspeed: { key: 'typing_best', label: 'Best: ', suffix: ' WPM' },
    memorymatch:    { key: 'memory_best', label: 'Best: ', suffix: ' moves' },
    spaceinvaders:  { key: 'invaders_best', label: 'Best: ' },
    fruitninja:     { key: 'fruitninja_best', label: 'Best: ' },
  };

  document.querySelectorAll('.game-card__best[data-game]').forEach(el => {
    const game = el.dataset.game;
    const info = scoreKeys[game];
    if (!info) return;
    const raw = localStorage.getItem(info.key);
    if (!raw) return;
    let val = info.parse ? info.parse(raw) : raw;
    if (val !== null && val !== undefined && val !== '') {
      el.textContent = info.label + val + (info.suffix || '');
      el.classList.add('has-score');
    }
  });
})();

// --- Game Thumbnails (mini canvas drawings) ---
(function drawThumbnails() {
  const thumbs = {
    minesweeper(ctx, w, h) {
      ctx.fillStyle='#0a0a14'; ctx.fillRect(0,0,w,h);
      const cs=8;
      for(let r=0;r<Math.floor(h/cs);r++) for(let c=0;c<Math.floor(w/cs);c++){
        ctx.fillStyle=((r+c)%2)?'#1a2744':'#162038';
        ctx.fillRect(c*cs,r*cs,cs-1,cs-1);
        if(Math.random()>.7){ctx.fillStyle='#10b981';ctx.font='6px sans-serif';ctx.fillText(Math.ceil(Math.random()*3),c*cs+2,r*cs+7);}
      }
      ctx.fillStyle='#ef4444';ctx.font='10px sans-serif';ctx.fillText('💣',w/2-5,h/2+3);
    },
    tictactoe(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
      const gx=w/3,gy=h/3;
      ctx.beginPath();ctx.moveTo(gx,4);ctx.lineTo(gx,h-4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(gx*2,4);ctx.lineTo(gx*2,h-4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,gy);ctx.lineTo(w-4,gy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,gy*2);ctx.lineTo(w-4,gy*2);ctx.stroke();
      ctx.strokeStyle='#8b5cf6';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(10,10);ctx.lineTo(gx-8,gy-8);ctx.stroke();
      ctx.beginPath();ctx.moveTo(gx-8,10);ctx.lineTo(10,gy-8);ctx.stroke();
      ctx.strokeStyle='#06b6d4';
      ctx.beginPath();ctx.arc(gx+gx/2,gy/2,10,0,Math.PI*2);ctx.stroke();
    },
    snake(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const segs=[{x:60,y:40},{x:54,y:40},{x:48,y:40},{x:42,y:40},{x:36,y:40},{x:30,y:40}];
      segs.forEach((s,i)=>{ctx.fillStyle=`rgb(16,${180+i*12},80)`;ctx.fillRect(s.x,s.y,5,5);});
      ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(90,30,3,0,Math.PI*2);ctx.fill();
    },
    tetris(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const blocks=[{x:40,y:60,c:'#06b6d4'},{x:50,y:60,c:'#06b6d4'},{x:60,y:60,c:'#06b6d4'},{x:70,y:60,c:'#06b6d4'},
                    {x:30,y:70,c:'#eab308'},{x:40,y:70,c:'#eab308'},{x:30,y:60,c:'#eab308'},{x:40,y:60,c:'#eab308'},
                    {x:50,y:70,c:'#8b5cf6'},{x:60,y:70,c:'#8b5cf6'},{x:70,y:70,c:'#8b5cf6'},{x:60,y:60,c:'#8b5cf6'}];
      blocks.forEach(b=>{ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,9,9);});
    },
    flappybird(ctx, w, h) {
      const grad=ctx.createLinearGradient(0,0,0,h);
      grad.addColorStop(0,'#0c1222');grad.addColorStop(1,'#0a1a2e');
      ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#22c55e';ctx.fillRect(60,0,12,25);ctx.fillRect(60,50,12,30);
      ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(35,38,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#1a2744';ctx.fillRect(0,h-8,w,8);
    },
    '2048'(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const tiles=[{v:2,c:'#1e293b'},{v:4,c:'#1e3a5f'},{v:8,c:'#7c2d12'},{v:16,c:'#9a3412'},
                   {v:32,c:'#991b1b'},{v:64,c:'#dc2626'},{v:128,c:'#a16207'},{v:256,c:'#ca8a04'},
                   {v:512,c:'#65a30d'},{v:2048,c:'#ec4899'}];
      const cs=26;
      for(let r=0;r<3;r++) for(let c=0;c<4;c++){
        const t=tiles[r*4+c]||tiles[0];
        ctx.fillStyle=t.c;ctx.beginPath();ctx.roundRect(4+c*(cs+3),4+r*(cs+3),cs,cs,3);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='bold 7px Inter';ctx.textAlign='center';
        ctx.fillText(t.v,4+c*(cs+3)+cs/2,4+r*(cs+3)+cs/2+3);
      }
    },
    sudoku(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const cs=8;
      for(let r=0;r<9;r++) for(let c=0;c<9;c++){
        ctx.strokeStyle=(r%3===0&&r>0)||(c%3===0&&c>0)?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.05)';
        ctx.strokeRect(6+c*cs,2+r*cs,cs,cs);
        if(Math.random()>.5){ctx.fillStyle='#10b981';ctx.font='6px Inter';ctx.fillText(Math.ceil(Math.random()*9),8+c*cs,9+r*cs);}
      }
    },
    wordle(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const colors=['#22c55e','#eab308','rgba(255,255,255,0.12)'];
      const word='GAMES';
      for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        const ci=r===0?[0,2,0,2,0][c]:r===1?[2,0,2,1,2][c]:[2,2,1,2,2][c];
        ctx.fillStyle=colors[ci];ctx.beginPath();ctx.roundRect(6+c*22,6+r*24,20,20,2);ctx.fill();
        if(r===0){ctx.fillStyle='#fff';ctx.font='bold 10px Inter';ctx.textAlign='center';ctx.fillText(word[c],16+c*22,21);}
      }
    },
    breakout(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const rc=['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];
      for(let r=0;r<5;r++) for(let c=0;c<8;c++){
        ctx.fillStyle=rc[r];ctx.fillRect(4+c*14,4+r*8,12,6);
      }
      ctx.fillStyle='#f43f5e';ctx.fillRect(w/2-15,h-10,30,5);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w/2,h-18,3,0,Math.PI*2);ctx.fill();
    },
    mathquiz(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#f59e0b';ctx.font='bold 20px Inter';ctx.textAlign='center';
      ctx.fillText('12+8=?',w/2,h/2-6);
      ctx.fillStyle='rgba(245,158,11,0.15)';
      ctx.beginPath();ctx.roundRect(8,h/2+6,w/2-12,18,4);ctx.fill();
      ctx.beginPath();ctx.roundRect(w/2+4,h/2+6,w/2-12,18,4);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 9px Inter';
      ctx.fillText('20',w/4,h/2+19);ctx.fillText('18',3*w/4,h/2+19);
    },
    typingspeed(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const words=['the','be','to','of','and'];
      ctx.font='9px Inter';ctx.textAlign='left';
      words.forEach((wd,i)=>{
        ctx.fillStyle=i===2?'#a78bfa':'#555';
        ctx.fillText(wd,8+i*22,h/2-2);
      });
      ctx.fillStyle='rgba(167,139,250,0.12)';ctx.fillRect(6,h/2+6,w-12,16);
      ctx.fillStyle='#a78bfa';ctx.fillRect(6,h/2+6,2,16);
      ctx.fillStyle='#a78bfa';ctx.font='bold 8px Inter';ctx.fillText('72 WPM',w-40,18);
    },
    pong(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#14b8a6';ctx.fillRect(8,h/2-14,4,28);
      ctx.fillStyle='#f43f5e';ctx.fillRect(w-12,h/2-14,4,28);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w/2,h/2,4,0,Math.PI*2);ctx.fill();
    },
    memorymatch(ctx, w, h) {
      ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,w,h);
      const emojis=['🎮','🎲','❓','🎯','❓','⭐','🎮','🎲'];
      for(let i=0;i<8;i++){
        const col=i%4,row=Math.floor(i/4);
        ctx.fillStyle=emojis[i]==='❓'?'rgba(236,72,153,0.12)':'rgba(34,197,94,0.12)';
        ctx.beginPath();ctx.roundRect(6+col*28,6+row*36,24,32,4);ctx.fill();
        ctx.font='14px serif';ctx.textAlign='center';
        ctx.fillText(emojis[i],18+col*28,28+row*36);
      }
    },
    spaceinvaders(ctx, w, h) {
      ctx.fillStyle='#06060e';ctx.fillRect(0,0,w,h);
      const ac=['#ef4444','#f59e0b','#22c55e'];
      for(let r=0;r<3;r++) for(let c=0;c<5;c++){
        ctx.fillStyle=ac[r];ctx.fillRect(16+c*20,10+r*16,14,10);
      }
      ctx.fillStyle='#22d3ee';
      ctx.beginPath();ctx.moveTo(w/2,h-12);ctx.lineTo(w/2+8,h-4);ctx.lineTo(w/2-8,h-4);ctx.closePath();ctx.fill();
      ctx.fillStyle='#22d3ee';ctx.fillRect(w/2-1,h-30,2,14);
    },
    fruitninja(ctx, w, h) {
      ctx.fillStyle='#08080f';ctx.fillRect(0,0,w,h);
      ctx.font='18px serif';ctx.textAlign='center';
      ctx.fillText('🍎',25,30);ctx.fillText('🍉',60,50);ctx.fillText('🍊',95,25);
      ctx.fillText('💣',40,65);
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(15,h-10);ctx.quadraticCurveTo(50,20,w-15,h/2);ctx.stroke();
    },
  };

  document.querySelectorAll('[data-thumb]').forEach(canvas => {
    const game = canvas.dataset.thumb;
    const fn = thumbs[game];
    if (!fn) return;
    const ctx = canvas.getContext('2d');
    fn(ctx, canvas.width, canvas.height);
  });
})();
