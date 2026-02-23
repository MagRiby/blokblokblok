const GRID = 8;
const COLORS = ['red', 'green', 'blue'];
const SHAPES = [
  [[1]],
  [[1,1]], [[1],[1]],
  [[1,1,1]], [[1],[1],[1]],
  [[1,1],[1,0]], [[1,1],[0,1]], [[0,1],[1,1]], [[1,0],[1,1]],
  [[1,1,1,1]], [[1],[1],[1],[1]],
  [[1,0],[1,0],[1,1]], [[0,1],[0,1],[1,1]], [[1,1],[1,0],[1,0]], [[1,1],[0,1],[0,1]],
  [[1,1,1],[0,1,0]], [[0,1],[1,1],[0,1]],
  [[1,1],[1,1]],
  [[1,1],[1,1],[1,1]], [[1,1,1],[1,1,1]],
  [[1,1,1,1,1]], [[1],[1],[1],[1],[1]],
  [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
];
const CLEAR_MESSAGES = [
  '✨ Nice!', '🔥 Great!', '💥 Awesome!', '⚡ Sweet!',
  '🌟 Brilliant!', '🎯 Perfect!', '💎 Amazing!'
];
const COMBO_MESSAGES = [
  '🔥🔥 COMBO!', '💥💥 DOUBLE!', '⚡⚡ MULTI!', '🌟🌟 MEGA!'
];

let board = [], score = 0, moves = 0, bestScore = 0;
let currentPieces = [], dragPiece = null, dragGhost = null;
let dragOffsetX = 0, dragOffsetY = 0;

// DOM
const startMenu = document.getElementById('start-menu');
const menuGrid = document.getElementById('menu-grid');
const playBtn = document.getElementById('play-btn');
const bestScoreDisplay = document.getElementById('best-score-display');
const gameContainer = document.getElementById('game-container');
const boardEl = document.getElementById('board');
const trayEl = document.getElementById('pieces-tray');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves-display');
const overlayEl = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const clearBanner = document.getElementById('clear-banner');

// ---- PARTICLES ----
let particles = [];
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnParticles(x, y, count, colors) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 1,
      decay: 0.005 + Math.random() * 0.01,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.08,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }
}

function updateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.99;
    p.life -= p.decay;
    p.rotation += p.rotSpeed;
    ctx.save();
    ctx.globalAlpha = Math.min(p.life, 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.fillStyle = p.color;
    // Mix of squares and circles
    if (p.size > 7) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    }
    ctx.restore();
  });
  if (particles.length > 0) requestAnimationFrame(updateParticles);
}

// ---- START MENU ----
function initMenu() {
  bestScore = parseInt(localStorage.getItem('blockPuzzleBest') || '0');
  if (bestScore > 0) bestScoreDisplay.textContent = `Best: ${bestScore}`;

  // Decorative grid
  menuGrid.innerHTML = '';
  const pattern = [
    'red','green','empty','blue',
    'empty','red','green','empty',
    'green','empty','blue','red',
    'blue','red','empty','green'
  ];
  pattern.forEach(c => {
    const b = document.createElement('div');
    b.className = 'menu-block ' + c;
    menuGrid.appendChild(b);
  });
}

playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  overlayEl.classList.remove('show');
  startGame();
});

function startGame() {
  startMenu.classList.add('hidden');
  gameContainer.classList.add('active');
  overlayEl.classList.remove('show');
  init();
}

function showMenu() {
  bestScore = Math.max(bestScore, score);
  localStorage.setItem('blockPuzzleBest', bestScore);
  if (bestScore > 0) bestScoreDisplay.textContent = `Best: ${bestScore}`;
  gameContainer.classList.remove('active');
  startMenu.classList.remove('hidden');
}

// ---- GAME INIT ----
function init() {
  board = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  score = 0;
  moves = 0;
  updateScore();
  buildBoard();
  prefillBoard();
  renderBoard();
  spawnPieces();
}

function prefillBoard() {
  // Place 8-14 random blocks, but ensure the spawned pieces can still fit
  const count = 8 + Math.floor(Math.random() * 7);
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 200) {
    const r = Math.floor(Math.random() * GRID);
    const c = Math.floor(Math.random() * GRID);
    if (!board[r][c]) {
      board[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
      placed++;
    }
    attempts++;
  }
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard() {
  boardEl.querySelectorAll('.cell').forEach(cell => {
    const r = +cell.dataset.row, c = +cell.dataset.col;
    cell.className = 'cell';
    if (board[r][c]) cell.classList.add(board[r][c]);
  });
}

function updateScore() {
  scoreEl.textContent = score;
  movesEl.textContent = moves;
}

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function randomShape() { return SHAPES[Math.floor(Math.random() * SHAPES.length)]; }

// ---- PIECES ----

// Shapes sorted roughly by size (small first) for smart spawning
const SMALL_SHAPES = SHAPES.filter(s => {
  let count = 0;
  s.forEach(r => r.forEach(v => { if (v) count++; }));
  return count <= 3;
});

function getEmptyCells() {
  let count = 0;
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (!board[r][c]) count++;
  return count;
}

function pickFittingShape() {
  // Shuffle all shapes and find one that fits
  const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
  for (const shape of shuffled) {
    if (canPlaceAnywhere(shape)) return shape;
  }
  // Nothing fits at all — return a single block as last resort
  return [[1]];
}

function spawnPieces() {
  currentPieces = [];
  trayEl.innerHTML = '';

  const empty = getEmptyCells();

  for (let i = 0; i < 3; i++) {
    let shape;
    if (empty < 15) {
      // Board is getting tight — only pick shapes that actually fit
      shape = pickFittingShape();
    } else if (empty < 25) {
      // Moderate space — prefer smaller shapes but allow any that fit
      const pool = Math.random() < 0.6 ? SMALL_SHAPES : SHAPES;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      shape = shuffled.find(s => canPlaceAnywhere(s)) || pickFittingShape();
    } else {
      // Plenty of space — any shape
      shape = randomShape();
    }
    const piece = { shape, color: randomColor(), index: i };
    currentPieces.push(piece);
    renderPiece(piece);
  }

  // Check if any piece can actually be placed
  checkGameOver();
}

function renderPiece(piece) {
  if (!piece) return;
  const rows = piece.shape.length, cols = piece.shape[0].length;
  const container = document.createElement('div');
  container.classList.add('piece-container');
  container.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
  container.style.gridTemplateRows = `repeat(${rows}, 32px)`;
  container.dataset.index = piece.index;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.classList.add('piece-cell');
      cell.classList.add(piece.shape[r][c] ? 'filled' : 'empty');
      if (piece.shape[r][c]) cell.classList.add(piece.color);
      container.appendChild(cell);
    }
  }

  container.addEventListener('mousedown', e => startDrag(e, piece));
  container.addEventListener('touchstart', e => startDrag(e, piece), { passive: false });
  trayEl.appendChild(container);
}

function refreshTray() {
  trayEl.innerHTML = '';
  currentPieces.forEach(p => { if (p) renderPiece(p); });
}

// ---- DRAG & DROP ----
const COLOR_STYLES = {
  red:   { bg: '#F44336', shadow: 'inset 0 -3px 0 #C62828, inset 0 2px 0 #EF5350' },
  green: { bg: '#4CAF50', shadow: 'inset 0 -3px 0 #2E7D32, inset 0 2px 0 #66BB6A' },
  blue:  { bg: '#2196F3', shadow: 'inset 0 -3px 0 #1565C0, inset 0 2px 0 #42A5F5' }
};

function getCellSize() {
  return (boardEl.getBoundingClientRect().width - 8) / GRID;
}

function startDrag(e, piece) {
  e.preventDefault();
  dragPiece = piece;
  const touch = e.touches ? e.touches[0] : e;
  const cellSize = getCellSize();

  dragGhost = document.createElement('div');
  Object.assign(dragGhost.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '999',
    display: 'grid', gap: '2px',
    gridTemplateColumns: `repeat(${piece.shape[0].length}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${piece.shape.length}, ${cellSize}px)`
  });

  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[0].length; c++) {
      const cell = document.createElement('div');
      Object.assign(cell.style, { borderRadius: '4px', width: cellSize+'px', height: cellSize+'px' });
      if (piece.shape[r][c]) {
        cell.style.background = COLOR_STYLES[piece.color].bg;
        cell.style.boxShadow = COLOR_STYLES[piece.color].shadow;
        cell.style.opacity = '0.8';
      }
      dragGhost.appendChild(cell);
    }
  }
  document.body.appendChild(dragGhost);

  dragOffsetX = piece.shape[0].length * (cellSize + 2) / 2;
  dragOffsetY = piece.shape.length * (cellSize + 2) / 2;
  moveGhost(touch.clientX, touch.clientY);

  trayEl.querySelectorAll('.piece-container').forEach(c => {
    if (+c.dataset.index === piece.index) c.classList.add('dragging');
  });

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
}

function moveGhost(cx, cy) {
  if (!dragGhost) return;
  dragGhost.style.left = (cx - dragOffsetX) + 'px';
  dragGhost.style.top = (cy - dragOffsetY) + 'px';
}

function ghostToBoardPos() {
  if (!dragGhost || !dragPiece) return null;
  const ghostRect = dragGhost.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  const padding = 4;
  const cellSize = (boardRect.width - padding * 2) / GRID;
  const x = ghostRect.left - boardRect.left - padding + cellSize / 2;
  const y = ghostRect.top - boardRect.top - padding + cellSize / 2;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  return (row >= 0 && col >= 0 && row < GRID && col < GRID) ? { row, col } : null;
}

function onDrag(e) {
  e.preventDefault();
  const touch = e.touches ? e.touches[0] : e;
  moveGhost(touch.clientX, touch.clientY);
  clearPreview();
  const pos = ghostToBoardPos();
  if (pos && dragPiece && canPlace(dragPiece.shape, pos.row, pos.col)) {
    showPreview(dragPiece.shape, pos.row, pos.col);
  }
}

function endDrag() {
  clearPreview();
  if (dragPiece) {
    const pos = ghostToBoardPos();
    if (pos && canPlace(dragPiece.shape, pos.row, pos.col)) {
      placePiece(dragPiece, pos.row, pos.col);
    }
  }
  if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  trayEl.querySelectorAll('.piece-container').forEach(c => c.classList.remove('dragging'));
  dragPiece = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', endDrag);
}

// ---- BOARD LOGIC ----
function canPlace(shape, sr, sc) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0].length; c++)
      if (shape[r][c]) {
        const nr = sr+r, nc = sc+c;
        if (nr<0||nr>=GRID||nc<0||nc>=GRID||board[nr][nc]) return false;
      }
  return true;
}

function canPlaceAnywhere(shape) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (canPlace(shape, r, c)) return true;
  return false;
}

function showPreview(shape, sr, sc) {
  const cells = boardEl.querySelectorAll('.cell');
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0].length; c++)
      if (shape[r][c]) {
        const idx = (sr+r)*GRID+(sc+c);
        if (cells[idx]) cells[idx].classList.add('preview');
      }
}

function clearPreview() {
  boardEl.querySelectorAll('.cell.preview').forEach(c => c.classList.remove('preview'));
}

function placePiece(piece, sr, sc) {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[0].length; c++)
      if (piece.shape[r][c]) board[sr+r][sc+c] = piece.color;

  let cellCount = 0;
  piece.shape.forEach(row => row.forEach(v => { if (v) cellCount++; }));
  score += cellCount;
  moves++;

  currentPieces[piece.index] = null;
  refreshTray();
  renderBoard();

  setTimeout(() => {
    clearLines();
    renderBoard();
    updateScore();
    if (currentPieces.every(p => p === null)) spawnPieces();
    else checkGameOver();
  }, 50);
}

// ---- LINE CLEARING WITH CELEBRATION ----
function clearLines() {
  let rowsToClear = [], colsToClear = [];

  for (let r = 0; r < GRID; r++)
    if (board[r].every(c => c !== null)) rowsToClear.push(r);

  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) if (!board[r][c]) { full = false; break; }
    if (full) colsToClear.push(c);
  }

  const totalLines = rowsToClear.length + colsToClear.length;
  if (totalLines === 0) return;

  score += totalLines * GRID;
  if (totalLines > 1) score += totalLines * 10;

  const cells = boardEl.querySelectorAll('.cell');
  const toClear = new Set();

  rowsToClear.forEach(r => { for (let c = 0; c < GRID; c++) toClear.add(r*GRID+c); });
  colsToClear.forEach(c => { for (let r = 0; r < GRID; r++) toClear.add(r*GRID+c); });

  // Clear board data IMMEDIATELY so game-over check sees the real state
  rowsToClear.forEach(r => { for (let c = 0; c < GRID; c++) board[r][c] = null; });
  colsToClear.forEach(c => { for (let r = 0; r < GRID; r++) board[r][c] = null; });

  // Staggered visual animation
  let delay = 0;
  toClear.forEach(idx => {
    setTimeout(() => cells[idx].classList.add('clearing'), delay);
    delay += 15;
  });

  // Particles
  const particleColors = ['#FFD600', '#FF5722', '#E91E63', '#00E676', '#2979FF', '#FFFFFF', '#FF9100', '#AA00FF'];
  toClear.forEach(idx => {
    const rect = cells[idx].getBoundingClientRect();
    spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 12, particleColors);
  });

  const boardRect = boardEl.getBoundingClientRect();
  spawnParticles(boardRect.left + boardRect.width/2, boardRect.top + boardRect.height/2, totalLines * 20, particleColors);
  requestAnimationFrame(updateParticles);

  // Screen shake
  boardEl.classList.remove('screen-shake');
  void boardEl.offsetWidth;
  boardEl.classList.add('screen-shake');
  setTimeout(() => boardEl.classList.remove('screen-shake'), 500);

  // Full screen flash
  const flash = document.getElementById('screen-flash');
  flash.classList.remove('flash');
  void flash.offsetWidth;
  flash.classList.add('flash');

  // Banner
  const msgs = totalLines > 1 ? COMBO_MESSAGES : CLEAR_MESSAGES;
  clearBanner.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  clearBanner.classList.remove('show');
  void clearBanner.offsetWidth;
  clearBanner.classList.add('show');
  setTimeout(() => clearBanner.classList.remove('show'), 1900);

  // Re-render after animation finishes
  setTimeout(() => renderBoard(), 900);
}


function checkGameOver() {
  const remaining = currentPieces.filter(p => p !== null);
  if (remaining.length === 0) return;

  // Check if ANY remaining piece can fit ANYWHERE on the board
  const anyFits = remaining.some(p => canPlaceAnywhere(p.shape));

  if (!anyFits) {
    bestScore = Math.max(bestScore, score);
    localStorage.setItem('blockPuzzleBest', bestScore);
    finalScoreEl.textContent = score;
    overlayEl.classList.add('show');
  }
}

// ---- BOOT ----
initMenu();
