// game.js — estado central del juego
const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const PADDLE_BOTTOM_MARGIN = 20;

const TITANIUM_SPRITE = 'block_gray';
const ZOOM_START_LEVEL = 6; // desde este nivel (inclusive) se aplica la escala reducida
const ZOOM_SCALE = 0.7; // factor aplicado a bloques, paleta y bola desde ZOOM_START_LEVEL

function cell( col, row, type ) {
  return { col, row, type };
}

function setTitanium( cells, coords ) {
  coords.forEach( ( [ col, row ] ) => {
    const existing = cells.find( ( c ) => c.col === col && c.row === row );
    if ( existing ) {
      existing.type = 'titanium';
    } else {
      cells.push( cell( col, row, 'titanium' ) );
    }
  } );
  return cells;
}

function buildLevel1() {
  // rectángulo clásico
  const colors = [ 'red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink' ];
  const cells = [];
  for ( let row = 0; row < 6; row++ ) {
    for ( let col = 0; col < 13; col++ ) {
      cells.push( cell( col, row, colors[ row ] ) );
    }
  }
  return { cols: 13, rows: 6, cells: setTitanium( cells, [] ) };
}

function buildLevel2() {
  // rombo
  const colors = [ 'yellow', 'cyan', 'magenta', 'hotpink' ]; // por distancia al centro: 0..3
  const cells = [];
  for ( let row = 0; row < 7; row++ ) {
    const dist = Math.abs( row - 3 );
    const width = 13 - dist * 4;
    const start = 6 - ( width - 1 ) / 2;
    for ( let col = start; col < start + width; col++ ) {
      cells.push( cell( col, row, colors[ dist ] ) );
    }
  }
  return { cols: 13, rows: 7, cells: setTitanium( cells, [] ) };
}

function buildLevel3() {
  // X
  const colors = [ 'red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink', 'red' ];
  const cells = [];
  for ( let row = 0; row < 7; row++ ) {
    const colA = row * 2;
    const colB = 12 - row * 2;
    cells.push( cell( colA, row, colors[ row ] ) );
    if ( colB !== colA ) cells.push( cell( colB, row, colors[ row ] ) );
  }
  return { cols: 13, rows: 7, cells: setTitanium( cells, [ [ 6, 3 ] ] ) };
}

function buildLevel4() {
  // escalera
  const colors = [ 'red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink', 'red' ];
  const cells = [];
  for ( let row = 0; row < 7; row++ ) {
    const startCol = row * 2;
    for ( let col = startCol; col <= Math.min( startCol + 2, 12 ); col++ ) {
      cells.push( cell( col, row, colors[ row ] ) );
    }
  }
  return { cols: 13, rows: 7, cells: setTitanium( cells, [ [ 7, 3 ] ] ) };
}

function buildLevel5() {
  // flecha hacia abajo
  const headColors = [ 'hotpink', 'magenta', 'yellow', 'red' ];
  const headWidths = [ 3, 7, 11, 13 ];
  const cells = [];
  headWidths.forEach( ( width, row ) => {
    const start = 6 - ( width - 1 ) / 2;
    for ( let col = start; col < start + width; col++ ) {
      cells.push( cell( col, row, headColors[ row ] ) );
    }
  } );
  for ( let row = 4; row <= 6; row++ ) {
    for ( let col = 5; col <= 7; col++ ) {
      cells.push( cell( col, row, 'cyan' ) );
    }
  }
  return { cols: 13, rows: 7, cells: setTitanium( cells, [ [ 6, 5 ], [ 6, 6 ] ] ) };
}

function buildLevel6() {
  // reloj de arena (nivel de zoom)
  const colors = [ 'magenta', 'cyan', 'green', 'yellow', 'red' ]; // por distancia al centro: 0..4
  const cells = [];
  for ( let row = 0; row < 9; row++ ) {
    const dist = Math.abs( row - 4 );
    const width = 1 + dist * 4;
    const start = 8 - ( width - 1 ) / 2;
    for ( let col = start; col < start + width; col++ ) {
      cells.push( cell( col, row, colors[ dist ] ) );
    }
  }
  return { cols: 17, rows: 9, cells: setTitanium( cells, [ [ 8, 4 ], [ 8, 0 ] ] ) };
}

function buildLevel7() {
  // cruz
  const cells = [];
  for ( let row = 0; row < 9; row++ ) {
    for ( let col = 7; col <= 9; col++ ) {
      cells.push( cell( col, row, 'cyan' ) );
    }
  }
  for ( let col = 0; col <= 16; col++ ) {
    if ( col >= 7 && col <= 9 ) continue;
    cells.push( cell( col, 4, 'yellow' ) );
  }
  return { cols: 17, rows: 9, cells: setTitanium( cells, [ [ 8, 0 ], [ 8, 8 ] ] ) };
}

function buildLevel8() {
  // rombo hueco con núcleo de titanio
  const colors = [ 'yellow', 'green', 'cyan', 'magenta', 'hotpink' ]; // por distancia al centro: 0..4
  const cells = [];
  for ( let row = 0; row < 9; row++ ) {
    const dist = Math.abs( row - 4 );
    const width = 17 - dist * 4;
    const start = 8 - ( width - 1 ) / 2;
    cells.push( cell( start, row, colors[ dist ] ) );
    if ( width > 1 ) cells.push( cell( start + width - 1, row, colors[ dist ] ) );
  }
  return { cols: 17, rows: 9, cells: setTitanium( cells, [ [ 8, 4 ], [ 8, 0 ], [ 8, 8 ] ] ) };
}

function buildLevel9() {
  // flecha hacia arriba
  const headWidths = [ 1, 5, 9, 13, 17 ];
  const headColors = [ 'red', 'yellow', 'green', 'cyan', 'magenta' ];
  const cells = [];
  headWidths.forEach( ( width, row ) => {
    const start = 8 - ( width - 1 ) / 2;
    for ( let col = start; col < start + width; col++ ) {
      cells.push( cell( col, row, headColors[ row ] ) );
    }
  } );
  for ( let row = 5; row <= 8; row++ ) {
    for ( let col = 6; col <= 10; col++ ) {
      cells.push( cell( col, row, 'hotpink' ) );
    }
  }
  return { cols: 17, rows: 9, cells: setTitanium( cells, [ [ 8, 0 ], [ 8, 6 ], [ 8, 8 ] ] ) };
}

function buildLevel10() {
  // fortaleza (nivel final)
  const cells = [];
  [ 0, 1, 7, 8 ].forEach( ( row ) => {
    for ( let col = 0; col <= 16; col++ ) {
      cells.push( cell( col, row, 'red' ) );
    }
  } );
  const coreColors = [ 'cyan', 'green', 'yellow' ]; // por distancia al centro: 0..2
  for ( let row = 2; row <= 6; row++ ) {
    const dist = Math.abs( row - 4 );
    const width = 17 - dist * 4;
    const start = 8 - ( width - 1 ) / 2;
    for ( let col = start; col < start + width; col++ ) {
      cells.push( cell( col, row, coreColors[ dist ] ) );
    }
  }
  return { cols: 17, rows: 9, cells: setTitanium( cells, [ [ 0, 0 ], [ 16, 0 ], [ 0, 8 ], [ 16, 8 ] ] ) };
}

const LEVELS = [
  buildLevel1(),
  buildLevel2(),
  buildLevel3(),
  buildLevel4(),
  buildLevel5(),
  buildLevel6(),
  buildLevel7(),
  buildLevel8(),
  buildLevel9(),
  buildLevel10(),
];

const levelSelect = document.getElementById( 'levelSelect' );

LEVELS.forEach( ( _, i ) => {
  const option = document.createElement( 'option' );
  option.value = String( i + 1 );
  option.textContent = 'Nivel ' + ( i + 1 );
  levelSelect.appendChild( option );
} );

const state = {
  screen: 'start', // 'start' | 'playing' | 'paused' | 'levelcomplete' | 'gameover' | 'victory'
  score: 0,
  highScore: 0, // cargado desde localStorage al iniciar
  lives: 3,
  level: 1, // nivel actual, 1-10
  scale: 1, // 1 para niveles 1-5, ZOOM_SCALE para niveles 6-10 (derivado de state.level)
  paddle: { x: ( canvas.width - 162 ) / 2, y: canvas.height - 14 - PADDLE_BOTTOM_MARGIN, w: 162, h: 14, speed: 8 },
  ball: {
    x: 0, y: 0, radius: 8, dx: 0, dy: 0, speed: 5,
    attachedToPaddle: true, // true hasta que se lanza con Space/click
  },
  bricks: [
    // { x, y, w, h, color, breakable, alive, exploding, explosionFrame, explosionStartedAt }
  ],
  particles: [
    // { x, y, dx, dy, size, color, life, maxLife }
  ],
};

state.ball.x = state.paddle.x + state.paddle.w / 2;
state.ball.y = state.paddle.y - state.ball.radius;

const HIGH_SCORE_KEY = 'arkanoid:highScore:v1';

function loadHighScore() {
  const stored = Number( localStorage.getItem( HIGH_SCORE_KEY ) );
  return Number.isFinite( stored ) ? stored : 0;
}

function saveHighScoreIfNeeded() {
  if ( state.score > state.highScore ) {
    state.highScore = state.score;
    localStorage.setItem( HIGH_SCORE_KEY, String( state.highScore ) );
  }
}

state.highScore = loadHighScore();

const BRICK_W = 32;
const BRICK_H = 16;
const BRICK_MARGIN_TOP = 40;
const BASE_PADDLE_W = 162;
const BASE_PADDLE_H = 14;
const BASE_BALL_RADIUS = 8;

function loadLevel( n ) {
  const levelData = LEVELS[ n - 1 ];
  const scale = n >= ZOOM_START_LEVEL ? ZOOM_SCALE : 1;
  const brickW = BRICK_W * scale;
  const brickH = BRICK_H * scale;
  const marginX = ( canvas.width - levelData.cols * brickW ) / 2;

  state.level = n;
  state.scale = scale;

  state.bricks = levelData.cells.map( ( c ) => ( {
    x: marginX + c.col * brickW,
    y: BRICK_MARGIN_TOP + c.row * brickH,
    w: brickW,
    h: brickH,
    color: c.type,
    breakable: c.type !== 'titanium',
    alive: true,
    exploding: false,
    explosionFrame: 0,
    explosionStartedAt: 0,
  } ) );
  state.particles = [];

  state.paddle.w = BASE_PADDLE_W * scale;
  state.paddle.h = BASE_PADDLE_H * scale;
  state.paddle.x = ( canvas.width - state.paddle.w ) / 2;
  state.paddle.y = canvas.height - state.paddle.h - PADDLE_BOTTOM_MARGIN;

  state.ball.radius = BASE_BALL_RADIUS * scale;
  resetBallToPaddle();
}

loadLevel( 1 );

const PARTICLE_COLORS = {
  red: '#e53935',
  yellow: '#fdd835',
  green: '#43a047',
  cyan: '#00acc1',
  magenta: '#d81b60',
  hotpink: '#ff4081',
};
const PARTICLE_MAX_COUNT = 150;
const PARTICLE_MIN_LIFE = 400;
const PARTICLE_MAX_LIFE = 600;
const PARTICLE_GRAVITY = 0.15;
const PARTICLE_FRAME_MS = 1000 / 60; // asume ~60fps, igual que la física del resto del juego

const keys = { left: false, right: false };

function isLeftKey( key ) {
  return key === 'ArrowLeft' || key === 'a' || key === 'A';
}

function isRightKey( key ) {
  return key === 'ArrowRight' || key === 'd' || key === 'D';
}

function startGame() {
  if ( state.screen !== 'start' ) return;
  state.screen = 'playing';
}

function togglePause() {
  if ( state.screen === 'playing' ) {
    state.screen = 'paused';
  } else if ( state.screen === 'paused' ) {
    state.screen = 'playing';
  }
}

function resetGame() {
  if ( state.screen !== 'gameover' && state.screen !== 'victory' ) return;

  state.score = 0;
  state.lives = 3;
  loadLevel( 1 );
  state.screen = 'start';
}

function advanceLevel() {
  if ( state.screen !== 'levelcomplete' ) return;

  loadLevel( state.level + 1 );
  state.screen = 'playing';
}

document.addEventListener( 'keydown', ( e ) => {
  if ( isLeftKey( e.key ) ) keys.left = true;
  if ( isRightKey( e.key ) ) keys.right = true;
  if ( e.key === ' ' ) {
    e.preventDefault();
    if ( state.screen === 'playing' ) launchBall();
  }
  if ( e.key === 'Enter' ) {
    if ( state.screen === 'start' ) startGame();
    if ( state.screen === 'gameover' || state.screen === 'victory' ) resetGame();
    if ( state.screen === 'levelcomplete' ) advanceLevel();
  }
  if ( e.key === 'Escape' ) {
    togglePause();
  }
} );

document.addEventListener( 'keyup', ( e ) => {
  if ( isLeftKey( e.key ) ) keys.left = false;
  if ( isRightKey( e.key ) ) keys.right = false;
} );

canvas.addEventListener( 'mousemove', ( e ) => {
  if ( state.screen !== 'playing' ) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const mouseX = ( e.clientX - rect.left ) * scaleX;
  state.paddle.x = mouseX - state.paddle.w / 2;
  clampPaddle();
} );

canvas.addEventListener( 'click', () => {
  if ( state.screen === 'start' ) {
    startGame();
    return;
  }
  if ( state.screen === 'gameover' || state.screen === 'victory' ) {
    resetGame();
    return;
  }
  if ( state.screen === 'levelcomplete' ) {
    advanceLevel();
    return;
  }
  if ( state.screen === 'playing' ) {
    launchBall();
  }
} );

levelSelect.addEventListener( 'change', () => {
  const chosen = Number( levelSelect.value );
  if ( chosen === state.level ) return;

  state.score = 0;
  loadLevel( chosen );
  state.screen = 'paused';
} );

function clampPaddle() {
  if ( state.paddle.x < 0 ) state.paddle.x = 0;
  if ( state.paddle.x > canvas.width - state.paddle.w ) state.paddle.x = canvas.width - state.paddle.w;
}

const ballBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );
const titaniumBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
titaniumBounceSound.playbackRate = 1.8; // más agudo que el rebote normal
titaniumBounceSound.volume = 0.4; // más suave que el rebote normal

function playBallBounce() {
  ballBounceSound.currentTime = 0;
  ballBounceSound.play();
}

function playBreakSound() {
  breakSound.currentTime = 0;
  breakSound.play();
}

function playTitaniumBounce() {
  titaniumBounceSound.currentTime = 0;
  titaniumBounceSound.play();
}

function launchBall() {
  if ( !state.ball.attachedToPaddle ) return;
  state.ball.attachedToPaddle = false;
  state.ball.dx = 0;
  state.ball.dy = -state.ball.speed;
}

function resetBallToPaddle() {
  state.ball.attachedToPaddle = true;
  state.ball.dx = 0;
  state.ball.dy = 0;
  state.ball.x = state.paddle.x + state.paddle.w / 2;
  state.ball.y = state.paddle.y - state.ball.radius;
}

function loseLife() {
  state.lives -= 1;
  resetBallToPaddle();
  if ( state.lives <= 0 ) {
    state.screen = 'gameover';
    saveHighScoreIfNeeded();
  }
}

function updateBall() {
  const ball = state.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.y - ball.radius > canvas.height ) {
    loseLife();
    return;
  }

  if ( ball.x - ball.radius <= 0 ) {
    ball.x = ball.radius;
    ball.dx = -ball.dx;
    playBallBounce();
  } else if ( ball.x + ball.radius >= canvas.width ) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -ball.dx;
    playBallBounce();
  }

  if ( ball.y - ball.radius <= 0 ) {
    ball.y = ball.radius;
    ball.dy = -ball.dy;
    playBallBounce();
  }

  checkPaddleCollision();
  checkBrickCollision();
}

const MAX_PADDLE_BOUNCE_ANGLE = Math.PI / 3; // 60°

function checkPaddleCollision() {
  const ball = state.ball;
  const paddle = state.paddle;

  if ( ball.dy <= 0 ) return;
  if ( ball.y + ball.radius < paddle.y ) return;
  if ( ball.y - ball.radius > paddle.y + paddle.h ) return;
  if ( ball.x + ball.radius < paddle.x || ball.x - ball.radius > paddle.x + paddle.w ) return;

  const hitPos = ( ball.x - ( paddle.x + paddle.w / 2 ) ) / ( paddle.w / 2 ); // -1..1
  const clampedHitPos = Math.max( -1, Math.min( 1, hitPos ) );
  const angle = clampedHitPos * MAX_PADDLE_BOUNCE_ANGLE;

  ball.dx = ball.speed * Math.sin( angle );
  ball.dy = -ball.speed * Math.cos( angle );
  ball.y = paddle.y - ball.radius;

  playBallBounce();
}

function spawnParticles( brick ) {
  const count = 6 + Math.floor( Math.random() * 3 ); // 6-8
  const centerX = brick.x + brick.w / 2;
  const centerY = brick.y + brick.h / 2;

  for ( let i = 0; i < count; i++ ) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    const maxLife = PARTICLE_MIN_LIFE + Math.random() * ( PARTICLE_MAX_LIFE - PARTICLE_MIN_LIFE );

    state.particles.push( {
      x: centerX,
      y: centerY,
      dx: Math.cos( angle ) * speed,
      dy: Math.sin( angle ) * speed,
      size: 2 + Math.random() * 2,
      color: PARTICLE_COLORS[ brick.color ],
      life: maxLife,
      maxLife,
    } );
  }

  if ( state.particles.length > PARTICLE_MAX_COUNT ) {
    state.particles.splice( 0, state.particles.length - PARTICLE_MAX_COUNT );
  }
}

function explodeBrick( brick ) {
  brick.exploding = true;
  brick.explosionStartedAt = performance.now();
  brick.explosionFrame = 0;
  state.score += 10;
  spawnParticles( brick );
  playBreakSound();
}

function checkBrickCollision() {
  const ball = state.ball;

  for ( const brick of state.bricks ) {
    if ( !brick.alive || brick.exploding ) continue;

    const closestX = Math.max( brick.x, Math.min( ball.x, brick.x + brick.w ) );
    const closestY = Math.max( brick.y, Math.min( ball.y, brick.y + brick.h ) );
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;

    if ( dx * dx + dy * dy > ball.radius * ball.radius ) continue;

    const overlapX = ball.radius - Math.abs( dx );
    const overlapY = ball.radius - Math.abs( dy );
    if ( overlapX < overlapY ) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }

    if ( brick.breakable ) {
      explodeBrick( brick );
    } else {
      playTitaniumBounce();
    }
    break;
  }
}

function updateBricks() {
  const now = performance.now();
  state.bricks.forEach( ( brick ) => {
    if ( !brick.exploding ) return;

    const elapsed = now - brick.explosionStartedAt;
    if ( elapsed >= EXPLOSION_DURATION ) {
      brick.alive = false;
      brick.exploding = false;
      return;
    }
    brick.explosionFrame = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
  } );
}

function updateParticles() {
  for ( let i = state.particles.length - 1; i >= 0; i-- ) {
    const particle = state.particles[ i ];
    particle.dy += PARTICLE_GRAVITY;
    particle.x += particle.dx;
    particle.y += particle.dy;
    particle.life -= PARTICLE_FRAME_MS;

    if ( particle.life <= 0 ) {
      state.particles.splice( i, 1 );
    }
  }
}

function checkLevelComplete() {
  if ( state.screen === 'gameover' ) return;

  const allBreakableCleared = state.bricks.every( ( brick ) => !brick.breakable || !brick.alive );
  if ( !allBreakableCleared ) return;

  if ( state.level === 10 ) {
    state.screen = 'victory';
    saveHighScoreIfNeeded();
  } else {
    state.screen = 'levelcomplete';
  }
}

function update() {
  if ( state.screen !== 'playing' ) return;

  if ( keys.left ) state.paddle.x -= state.paddle.speed;
  if ( keys.right ) state.paddle.x += state.paddle.speed;
  clampPaddle();

  if ( state.ball.attachedToPaddle ) {
    state.ball.x = state.paddle.x + state.paddle.w / 2;
    state.ball.y = state.paddle.y - state.ball.radius;
  } else {
    updateBall();
  }

  updateBricks();
  updateParticles();
  checkLevelComplete();
}

function renderBricks() {
  state.bricks.forEach( ( brick ) => {
    if ( !brick.alive ) return;
    if ( brick.exploding ) {
      const frame = EXPLOSION_FRAMES[ brick.color ][ brick.explosionFrame ];
      drawFrame( ctx, frame, brick.x, brick.y, brick.w, brick.h );
      return;
    }
    if ( !brick.breakable ) {
      drawSprite( ctx, TITANIUM_SPRITE, brick.x, brick.y, brick.w, brick.h );
      return;
    }
    drawSprite( ctx, 'block_' + brick.color, brick.x, brick.y, brick.w, brick.h );
  } );
}

function drawParticles() {
  state.particles.forEach( ( particle ) => {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect( particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size );
  } );
  ctx.globalAlpha = 1;
}

function renderHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText( 'Score: ' + state.score, 8, 8 );
  ctx.textAlign = 'left';

  const lifeSize = 16;
  const lifeGap = 6;
  for ( let i = 0; i < state.lives; i++ ) {
    const x = canvas.width - 8 - lifeSize - i * ( lifeSize + lifeGap );
    drawSprite( ctx, 'ball', x, 8, lifeSize, lifeSize );
  }
}

function renderStartOverlay() {
  if ( state.screen !== 'start' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.fillStyle = '#fff';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'Presiona Enter para jugar', canvas.width / 2, canvas.height / 2 );
  ctx.font = '16px sans-serif';
  ctx.fillText( 'High Score: ' + state.highScore, canvas.width / 2, canvas.height / 2 + 32 );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function renderPauseOverlay() {
  if ( state.screen !== 'paused' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'PAUSA', canvas.width / 2, canvas.height / 2 );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function syncLevelSelect() {
  levelSelect.style.display = state.screen === 'paused' ? 'block' : 'none';
  if ( levelSelect.value !== String( state.level ) ) {
    levelSelect.value = String( state.level );
  }
}

function renderLevelCompleteOverlay() {
  if ( state.screen !== 'levelcomplete' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'NIVEL ' + state.level + ' COMPLETADO', canvas.width / 2, canvas.height / 2 );
  ctx.font = '16px sans-serif';
  ctx.fillText( 'Score: ' + state.score, canvas.width / 2, canvas.height / 2 + 32 );
  ctx.fillText( 'Presiona Enter para continuar', canvas.width / 2, canvas.height / 2 + 56 );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function renderGameOverOverlay() {
  if ( state.screen !== 'gameover' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'GAME OVER', canvas.width / 2, canvas.height / 2 );
  ctx.font = '16px sans-serif';
  ctx.fillText( 'Score: ' + state.score, canvas.width / 2, canvas.height / 2 + 32 );
  ctx.fillText( 'High Score: ' + state.highScore, canvas.width / 2, canvas.height / 2 + 56 );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function renderVictoryOverlay() {
  if ( state.screen !== 'victory' ) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'VICTORY', canvas.width / 2, canvas.height / 2 );
  ctx.font = '16px sans-serif';
  ctx.fillText( 'Score: ' + state.score, canvas.width / 2, canvas.height / 2 + 32 );
  ctx.fillText( 'High Score: ' + state.highScore, canvas.width / 2, canvas.height / 2 + 56 );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function render() {
  ctx.clearRect( 0, 0, canvas.width, canvas.height );

  renderBricks();
  drawParticles();
  drawSprite( ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h );
  drawSprite( ctx, 'ball', state.ball.x - state.ball.radius, state.ball.y - state.ball.radius, state.ball.radius * 2, state.ball.radius * 2 );
  renderHUD();
  renderStartOverlay();
  renderPauseOverlay();
  renderLevelCompleteOverlay();
  renderGameOverOverlay();
  renderVictoryOverlay();
  syncLevelSelect();
}

function loop() {
  update();
  render();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  requestAnimationFrame( loop );
} );
