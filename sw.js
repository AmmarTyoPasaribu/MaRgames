/* MaRgames — Service Worker for Offline Play */

const CACHE_NAME = 'margames-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/logo.png',
  '/manifest.json',
  '/minesweeper/',
  '/minesweeper/index.html',
  '/minesweeper/style.css',
  '/minesweeper/game.js',
  '/tictactoe/',
  '/tictactoe/index.html',
  '/tictactoe/style.css',
  '/tictactoe/game.js',
  '/snake/',
  '/snake/index.html',
  '/snake/style.css',
  '/snake/game.js',
  '/tetris/',
  '/tetris/index.html',
  '/tetris/style.css',
  '/tetris/game.js',
  '/flappybird/',
  '/flappybird/index.html',
  '/flappybird/style.css',
  '/flappybird/game.js',
  '/2048/',
  '/2048/index.html',
  '/2048/style.css',
  '/2048/game.js',
  '/sudoku/',
  '/sudoku/index.html',
  '/sudoku/style.css',
  '/sudoku/game.js',
  '/wordle/',
  '/wordle/index.html',
  '/wordle/style.css',
  '/wordle/game.js',
  '/breakout/',
  '/breakout/index.html',
  '/breakout/style.css',
  '/breakout/game.js',
  '/mathquiz/',
  '/mathquiz/index.html',
  '/mathquiz/style.css',
  '/mathquiz/game.js',
  '/typingspeed/',
  '/typingspeed/index.html',
  '/typingspeed/style.css',
  '/typingspeed/game.js',
  '/pong/',
  '/pong/index.html',
  '/pong/style.css',
  '/pong/game.js',
  '/memorymatch/',
  '/memorymatch/index.html',
  '/memorymatch/style.css',
  '/memorymatch/game.js',
  '/spaceinvaders/',
  '/spaceinvaders/index.html',
  '/spaceinvaders/style.css',
  '/spaceinvaders/game.js',
  '/fruitninja/',
  '/fruitninja/index.html',
  '/fruitninja/style.css',
  '/fruitninja/game.js',
];

// Install — cache all game assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
