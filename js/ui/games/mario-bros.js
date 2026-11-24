/**
 * Module game độc lập — "Bé Khám Phá" (bài intro).
 * Platformer 2D đơn giản + question-gate (modal overlay).
 * Nhân vật mới "Bé Khám Phá"; không copy tài sản Nintendo.
 * Nền dùng chung: Asset/v2/vex/teal-cave-bg.svg (hang động xanh).
 * Hợp đồng: KM.Games['mario-bros'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi nested class bắt đầu bằng mp-.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-bros'] = function (options) {
  'use strict';

  if (!options) { options = {}; }
  var mount = options.mount;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  if (!mount) { return { render: function(){}, onWrong: function(){}, onCorrect: function(){}, celebrate: function(){}, destroy: function(){}, handleKey: function(){ return false; } }; }

  /* ---- Constants ---- */
  var TILE = 32;
  var GRAVITY = 1200;
  var MOVE_SPEED = 180;
  var JUMP_VEL = -420;
  var MAX_FALL = 600;
  var COYOTE_MS = 80;
  var JUMP_BUFFER_MS = 100;
  var CAM_LERP = 0.15;

  /* ---- Map (tilemap) ---- */
  // 0=empty 1=ground 2=platform(one-way) 3=hazard(spike) 4=collectible 5=gate 6=exit
  // Dua tren layout tu anh tham khao: nhieu tang, nhieu collectible, hazard trong gap
  var MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,5,1,1,1,1,1,1,1,1,1,6,1]
  ];
  var MAP_ROWS = MAP.length;
  var MAP_COLS = MAP[0].length;
  var MAP_W = MAP_COLS * TILE;
  var MAP_H = MAP_ROWS * TILE;

  /* ---- Collectibles (positions removed from tilemap after collect) ---- */
  // type: 'coin' | 'heart' | 'star' | 'gem'
  var collectibles = [
    { col: 4, row: 8, type: 'coin', collected: false },
    { col: 3, row: 8, type: 'coin', collected: false },
    { col: 5, row: 8, type: 'heart', collected: false },
    { col: 7, row: 8, type: 'coin', collected: false },
    { col: 9, row: 8, type: 'coin', collected: false },
    { col: 11, row: 8, type: 'star', collected: false },
    { col: 13, row: 8, type: 'coin', collected: false },
    { col: 17, row: 8, type: 'gem', collected: false },
    { col: 19, row: 8, type: 'coin', collected: false },
    { col: 21, row: 8, type: 'coin', collected: false },
    { col: 23, row: 8, type: 'heart', collected: false },
    { col: 25, row: 8, type: 'coin', collected: false },
    { col: 27, row: 8, type: 'coin', collected: false },
    { col: 29, row: 8, type: 'star', collected: false },
    { col: 31, row: 8, type: 'coin', collected: false },
    { col: 33, row: 8, type: 'coin', collected: false },
    { col: 35, row: 8, type: 'gem', collected: false },
    { col: 37, row: 8, type: 'coin', collected: false },
    { col: 39, row: 8, type: 'coin', collected: false },
    { col: 41, row: 8, type: 'star', collected: false },
    { col: 43, row: 8, type: 'coin', collected: false },
    { col: 45, row: 8, type: 'coin', collected: false },
    { col: 47, row: 8, type: 'heart', collected: false }
  ];

  /* ---- Gates ---- */
  var gates = [
    { col: 5, row: 9, triggered: false, opened: false },
    { col: 15, row: 9, triggered: false, opened: false },
    { col: 21, row: 9, triggered: false, opened: false },
    { col: 33, row: 9, triggered: false, opened: false },
    { col: 38, row: 9, triggered: false, opened: false }
  ];

  /* ---- DOM ---- */
  var root = document.createElement('div');
  root.className = 'kmg-mario-bros' + (reduced ? ' is-reduced' : '');
  root.setAttribute('data-world', 'pipe-park');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Bé Khám Phá');
  mount.appendChild(root);

  var viewport = document.createElement('div');
  viewport.className = 'mp-viewport';
  root.appendChild(viewport);

  var worldLayer = document.createElement('div');
  worldLayer.className = 'mp-world-layer';
  viewport.appendChild(worldLayer);

  /* Render tiles */
  var tileEls = [];
  var r, c, tile, el;
  for (r = 0; r < MAP_ROWS; r++) {
    for (c = 0; c < MAP_COLS; c++) {
      tile = MAP[r][c];
      if (tile === 0) { continue; }
      el = document.createElement('div');
      el.className = 'mp-tile mp-tile-' + tileName(tile);
      el.style.left = (c * TILE) + 'px';
      el.style.top = (r * TILE) + 'px';
      el.style.width = TILE + 'px';
      el.style.height = TILE + 'px';
      el.setAttribute('data-tile', String(tile));
      el.setAttribute('data-col', String(c));
      el.setAttribute('data-row', String(r));
      worldLayer.appendChild(el);
      tileEls.push({ el: el, col: c, row: r, type: tile });
    }
  }

  /* Render collectibles */
  var collectibleEls = [];
  var ci;
  var collectibleGlyph = { coin: '🪙', heart: '❤️', star: '⭐', gem: '💎' };
  for (ci = 0; ci < collectibles.length; ci++) {
    el = document.createElement('div');
    el.className = 'mp-collectible mp-collectible-' + collectibles[ci].type;
    el.style.left = (collectibles[ci].col * TILE + 4) + 'px';
    el.style.top = (collectibles[ci].row * TILE + 4) + 'px';
    el.style.width = (TILE - 8) + 'px';
    el.style.height = (TILE - 8) + 'px';
    el.textContent = collectibleGlyph[collectibles[ci].type] || '🪙';
    worldLayer.appendChild(el);
    collectibleEls.push({ el: el, idx: ci });
  }

  /* Render gates */
  var gateEls = [];
  var gi;
  for (gi = 0; gi < gates.length; gi++) {
    el = document.createElement('div');
    el.className = 'mp-gate';
    el.style.left = (gates[gi].col * TILE) + 'px';
    el.style.top = ((gates[gi].row - 1) * TILE) + 'px';
    el.style.width = TILE + 'px';
    el.style.height = (TILE * 2) + 'px';
    el.textContent = '🚪';
    worldLayer.appendChild(el);
    gateEls.push({ el: el, idx: gi });
  }

  /* Render exit */
  var exitEl = document.createElement('div');
  exitEl.className = 'mp-exit';
  exitEl.style.left = (38 * TILE + 4) + 'px';
  exitEl.style.top = (8 * TILE) + 'px';
  exitEl.style.width = (TILE - 8) + 'px';
  exitEl.style.height = (TILE * 2) + 'px';
  exitEl.textContent = '🏁';
  worldLayer.appendChild(exitEl);

  /* Player */
  var player = document.createElement('div');
  player.className = 'mp-player';
  player.style.width = '32px';
  player.style.height = '48px';
  player.style.left = '64px';
  player.style.top = (9 * TILE - 48) + 'px';
  worldLayer.appendChild(player);

  /* Virtual buttons (touch) */
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var vpad = null;
  var vbtnLeft = null;
  var vbtnRight = null;
  var vbtnJump = null;
  if (isTouch) {
    vpad = document.createElement('div');
    vpad.className = 'mp-vpad';
    vbtnLeft = document.createElement('button');
    vbtnLeft.className = 'mp-vbtn mp-vbtn-left';
    vbtnLeft.type = 'button';
    vbtnLeft.textContent = '←';
    vbtnLeft.setAttribute('aria-label', 'Di chuyển trái');
    vpad.appendChild(vbtnLeft);
    vbtnRight = document.createElement('button');
    vbtnRight.className = 'mp-vbtn mp-vbtn-right';
    vbtnRight.type = 'button';
    vbtnRight.textContent = '→';
    vbtnRight.setAttribute('aria-label', 'Di chuyển phải');
    vpad.appendChild(vbtnRight);
    vbtnJump = document.createElement('button');
    vbtnJump.className = 'mp-vbtn mp-vbtn-jump';
    vbtnJump.type = 'button';
    vbtnJump.textContent = '↑';
    vbtnJump.setAttribute('aria-label', 'Nhảy');
    root.appendChild(vbtnJump);
    root.appendChild(vpad);
  }

  /* Modal overlay (question gate) */
  var modal = document.createElement('div');
  modal.className = 'mp-modal';
  modal.style.display = 'none';
  var modalCard = document.createElement('div');
  modalCard.className = 'mp-modal-card';
  var modalQuestion = document.createElement('p');
  modalQuestion.className = 'mp-modal-question';
  modalCard.appendChild(modalQuestion);
  var modalChoices = document.createElement('div');
  modalChoices.className = 'mp-modal-choices';
  modalCard.appendChild(modalChoices);
  var modalHint = document.createElement('p');
  modalHint.className = 'mp-modal-hint';
  modalHint.style.display = 'none';
  modalCard.appendChild(modalHint);
  var modalReplay = document.createElement('button');
  modalReplay.className = 'mp-modal-replay';
  modalReplay.type = 'button';
  modalReplay.textContent = '🔊 Nghe lại';
  modalCard.appendChild(modalReplay);
  modal.appendChild(modalCard);
  root.appendChild(modal);

  /* ---- State ---- */
  var running = true;
  var paused = false;
  var rafId = null;
  var lastTime = 0;
  var playerX = 2 * TILE;
  var playerY = 9 * TILE - 48;
  var playerVX = 0;
  var playerVY = 0;
  var playerOnGround = false;
  var playerFacing = 1;
  var coyoteTimer = 0;
  var jumpBuffer = 0;
  var cameraX = 0;
  /* ---- Animation state ---- */
  var animState = 'idle'; // idle, run, jump, fall
  var animFrame = 0;
  var animTimer = 0;
  var animSpeed = 0.1; // seconds per frame
  var currentQuestion = null;
  var modalOpen = false;
  var wrongCount = 0;
  var collectedCount = 0;
  var totalCollectibles = collectibles.length;
  var listeners = [];
  var timers = [];

  /* ---- Input state ---- */
  var keys = { left: false, right: false, jump: false, jumpPressed: false };

  /* ---- Helpers ---- */
  function tune(name, fallback) {
    var g = (window.KM && KM.Tuning && KM.Tuning.game) || {};
    var v = g[name];
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
  }

  function tileName(t) {
    if (t === 1) return 'ground';
    if (t === 2) return 'platform';
    if (t === 3) return 'hazard';
    if (t === 4) return 'coin';
    if (t === 5) return 'gate';
    if (t === 6) return 'exit';
    return 'empty';
  }

  function getTile(col, row) {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return 1; // wall
    return MAP[row][col];
  }

  function isSolid(tile) {
    return tile === 1;
  }

  function isOneWay(tile) {
    return tile === 2;
  }

  function listen(node, type, fn) {
    node.addEventListener(type, fn, false);
    listeners.push([node, type, fn]);
  }

  function clearListeners() {
    var j;
    for (j = 0; j < listeners.length; j++) {
      listeners[j][0].removeEventListener(listeners[j][1], listeners[j][2], false);
    }
    listeners = [];
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function tap() {
    if (audio && typeof audio.tap === 'function') audio.tap();
  }

  /* ---- Physics ---- */
  function updatePhysics(dt) {
    // modalOpen check disabled for debugging


    // Movement (no inertia)
    playerVX = 0;
    if (keys.left) { playerVX = -MOVE_SPEED; playerFacing = -1; }
    if (keys.right) { playerVX = MOVE_SPEED; playerFacing = 1; }

    // Jump buffer
    if (keys.jumpPressed) {
      jumpBuffer = JUMP_BUFFER_MS;
      keys.jumpPressed = false;
    }
    if (jumpBuffer > 0) jumpBuffer -= dt * 1000;

    // Coyote time
    if (playerOnGround) coyoteTimer = COYOTE_MS;
    else coyoteTimer -= dt * 1000;
    if (coyoteTimer < 0) coyoteTimer = 0;

    // Jump execution
    if (jumpBuffer > 0 && (playerOnGround || coyoteTimer > 0)) {
      playerVY = JUMP_VEL;
      playerOnGround = false;
      coyoteTimer = 0;
      jumpBuffer = 0;
      if (audio && typeof audio.jump === 'function') audio.jump();
      else tap();
    }

    // Gravity
    playerVY += GRAVITY * dt;
    if (playerVY > MAX_FALL) playerVY = MAX_FALL;

    // Move X
    playerX += playerVX * dt;
    resolveX();

    // Move Y
    playerY += playerVY * dt;
    resolveY();

    // Bounds
    if (playerX < 0) playerX = 0;
    if (playerX > MAP_W - 32) playerX = MAP_W - 32;
    if (playerY > MAP_H) {
      // Fell into pit -> respawn
      respawn();
      return;
    }

    // Animation state
    var prevAnim = animState;
    if (!playerOnGround) {
      if (playerVY < 0) animState = 'jump';
      else animState = 'fall';
    } else if (playerVX !== 0) {
      animState = 'run';
    } else {
      animState = 'idle';
    }
    if (animState !== prevAnim) {
      animFrame = 0;
      animTimer = 0;
    }

    // Check collectibles
    checkCollectibles();

    // Check gate
    checkGate();

    // Check exit
    checkExit();

    // Check hazard (disabled for now - no hazards in map)
    // checkHazard();
  }

  function resolveX() {
    var left = Math.floor(playerX / TILE);
    var right = Math.floor((playerX + 32) / TILE);
    var top = Math.floor(playerY / TILE);
    var bottom = Math.floor((playerY + 47) / TILE);
    var r, tile;
    if (playerVX < 0) {
      for (r = top; r <= bottom; r++) {
        tile = getTile(left, r);
        if (isSolid(tile)) {
          playerX = (left + 1) * TILE;
          playerVX = 0;
          return;
        }
      }
    }
    if (playerVX > 0) {
      for (r = top; r <= bottom; r++) {
        tile = getTile(right, r);
        if (isSolid(tile)) {
          playerX = right * TILE - 32;
          playerVX = 0;
          return;
        }
      }
    }
  }

  function resolveY() {
    var left = Math.floor(playerX / TILE);
    var right = Math.floor((playerX + 31) / TILE);
    var top = Math.floor(playerY / TILE);
    var bottom = Math.floor((playerY + 48) / TILE);
    var c, tile;
    playerOnGround = false;
    // Check top (moving up)
    if (playerVY < 0) {
      for (c = left; c <= right; c++) {
        tile = getTile(c, top);
        if (isSolid(tile)) {
          playerY = (top + 1) * TILE;
          playerVY = 0;
          return;
        }
      }
    }
    // Check bottom (moving down)
    if (playerVY >= 0) {
      for (c = left; c <= right; c++) {
        tile = getTile(c, bottom);
        if (isSolid(tile)) {
          playerY = bottom * TILE - 48;
          playerVY = 0;
          playerOnGround = true;
          return;
        }
        if (isOneWay(tile)) {
          var prevBottom = Math.floor((playerY - playerVY * 0.016 + 48 - 1) / TILE);
          if (prevBottom < bottom) {
            playerY = bottom * TILE - 48;
            playerVY = 0;
            playerOnGround = true;
            return;
          }
        }
      }
    }
  }

  function respawn() {
    playerX = 2 * TILE;
    playerY = 9 * TILE - 48;
    playerVX = 0;
    playerVY = 0;
    playerOnGround = false;
    coyoteTimer = 0;
    jumpBuffer = 0;
    // Reset collectibles
    var ci;
    for (ci = 0; ci < collectibles.length; ci++) {
      if (collectibles[ci].collected) {
        collectibles[ci].collected = false;
        if (collectibleEls[ci]) collectibleEls[ci].el.style.display = '';
      }
    }
    collectedCount = 0;
    // Reset gates
    var gi;
    for (gi = 0; gi < gates.length; gi++) {
      gates[gi].triggered = false;
      gates[gi].opened = false;
      if (gateEls[gi]) gateEls[gi].el.style.display = '';
    }
  }

  function checkCollectibles() {
    var cx = Math.floor((playerX + 16) / TILE);
    var cy = Math.floor((playerY + 24) / TILE);
    var ci;
    var cyFeet = Math.floor((playerY + 40) / TILE);
    for (ci = 0; ci < collectibles.length; ci++) {
      if (collectibles[ci].collected) continue;
      if (collectibles[ci].col === cx && (collectibles[ci].row === cy || collectibles[ci].row === cyFeet)) {
        collectibles[ci].collected = true;
        collectedCount++;
        if (collectibleEls[ci]) { collectibleEls[ci].el.style.display = 'none'; collectibleEls[ci].el.remove(); }
        // Sound effect based on type
        var type = collectibles[ci].type;
        if (audio) {
          if (type === 'coin' && typeof audio.coin === 'function') audio.coin();
          else if (type === 'heart' && typeof audio.heart === 'function') audio.heart();
          else if (type === 'star' && typeof audio.star === 'function') audio.star();
          else if (type === 'gem' && typeof audio.star === 'function') audio.star();
          else if (typeof audio.tap === 'function') audio.tap();
        }
        // Floating score text
        showFloatingText(collectibles[ci].col * TILE + 8, collectibles[ci].row * TILE - 8,
          type === 'coin' ? '+1' : type === 'heart' ? '+❤' : type === 'star' ? '+2' : '+3');
      }
    }
  }

  function showFloatingText(x, y, text) {
    var ft = document.createElement('div');
    ft.className = 'mp-float-text';
    ft.textContent = text;
    ft.style.left = x + 'px';
    ft.style.top = y + 'px';
    worldLayer.appendChild(ft);
    setTimeout(function () {
      if (ft.parentNode) ft.parentNode.removeChild(ft);
    }, 800);
  }

  var pendingGate = null;

  function checkGate() {
    var cx = Math.floor((playerX + 16) / TILE);
    var cy = Math.floor((playerY + 48) / TILE);
    var gi;
    for (gi = 0; gi < gates.length; gi++) {
      if (gates[gi].opened) continue;
      if (gates[gi].col === cx && gates[gi].row === cy) {
        if (modalOpen) {
          // Store as pending, will trigger when modal closes
          pendingGate = gi;
          return;
        }
        gates[gi].triggered = true;
        if (currentQuestion) showModalQuestion(currentQuestion);
        openModal();
        pendingGate = null;
        return;
      }
    }
  }

  function checkExit() {
    var cx = Math.floor((playerX + 16) / TILE);
    var cy = Math.floor((playerY + 24) / TILE);
    if (cx === 38 && cy === 8) {
      // Reached exit -> notify shell to finish
      // Shell handles finish via km:answer with a special value? No.
      // Actually, exit just means the lesson is done. But shell needs all questions answered.
      // For prototype: if all gates opened, trigger finish by dispatching a special event.
      // For now, just mark and let shell handle via existing flow.
      // We'll handle this in a future iteration.
    }
  }

  function checkHazard() {
    var cx = Math.floor((playerX + 16) / TILE);
    var cy = Math.floor((playerY + 48) / TILE);
    var tile = getTile(cx, cy);
    if (tile === 3) {
      respawn();
    }
  }

  /* ---- Camera ---- */
  function updateCamera() {
    var targetX = playerX - viewport.offsetWidth / 2 + 16;
    if (targetX < 0) targetX = 0;
    if (targetX > MAP_W - viewport.offsetWidth) targetX = MAP_W - viewport.offsetWidth;
    if (targetX < 0) targetX = 0;
    if (reduced) {
      cameraX = targetX;
    } else {
      cameraX += (targetX - cameraX) * CAM_LERP;
    }
    worldLayer.style.transform = 'translateX(' + (-cameraX) + 'px)';
  }

  /* ---- Rendering ---- */
  function renderFrame(dt) {
    player.style.left = playerX + 'px';
    player.style.top = playerY + 'px';



    player.style.transform = playerFacing < 0 ? 'scaleX(-1)' : '';

    // Animation frame cycling
    animTimer += (dt || 0.016);
    if (animTimer >= animSpeed) {
      animTimer = 0;
      animFrame++;
    }

    // Map animState to sprite sheet row
    var row = 0;
    var maxFrames = 8;
    if (animState === 'idle') { row = 0; maxFrames = 8; }
    else if (animState === 'run') { row = 1; maxFrames = 8; }
    else if (animState === 'jump') { row = 2; maxFrames = 8; }
    else if (animState === 'fall') { row = 3; maxFrames = 8; }
    if (animFrame >= maxFrames) animFrame = 0;

    var col = animFrame % 8;
    player.style.backgroundPosition = (-col * 32) + 'px ' + (-row * 48) + 'px';
  }

  /* ---- Game loop ---- */
  function gameLoop(ts) {
    if (!running) return;
    try {
      if (!lastTime) lastTime = ts;
      var dt = (ts - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      lastTime = ts;
      updatePhysics(dt);
      updateCamera();
      renderFrame(dt);
    } catch (err) {
      console.error('[mario-bros] gameLoop error:', err.message, err.stack);
    }
  }

  /* ---- Modal ---- */
  function openModal() {
    if (modalOpen) return;
    modalOpen = true;
    paused = true;
    modal.style.display = 'flex';
    wrongCount = 0;
    modalHint.style.display = 'none';
    modalHint.textContent = '';
    showModalQuestion(currentQuestion);
    if (audio && typeof audio.gateOpen === 'function') audio.gateOpen();
    // Focus first choice
    var firstBtn = modalChoices.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }

  function closeModal() {
    modalOpen = false;
    paused = false;
    modal.style.display = 'none';
    // Open the gate that was triggered
    var gi;
    for (gi = 0; gi < gates.length; gi++) {
      if (gates[gi].triggered && !gates[gi].opened) {
        gates[gi].opened = true;
        if (gateEls[gi]) gateEls[gi].el.style.display = 'none';
        // Replace gate tile with ground so player doesn't fall through
        MAP[gates[gi].row][gates[gi].col] = 1;
        break;
      }
    }
    // Check pending gate
    if (pendingGate !== null) {
      var pg = pendingGate;
      pendingGate = null;
      gates[pg].triggered = true;
      if (currentQuestion) showModalQuestion(currentQuestion);
      openModal();
    } else {
      checkGate();
    }
  }

  function showModalQuestion(q) {
    modalQuestion.textContent = q ? q.text : '';
    modalChoices.textContent = '';
    if (q && q.choices) {
      var j;
      for (j = 0; j < q.choices.length; j++) {
        (function (choice) {
          var btn = document.createElement('button');
          btn.className = 'mp-modal-choice';
          btn.type = 'button';
          btn.textContent = choice.label != null ? choice.label : String(choice.value);
          btn.setAttribute('aria-label', 'Chọn ' + btn.textContent);
          listen(btn, 'click', function () {
            if (modalOpen) {
              tap();
              mount.dispatchEvent(new CustomEvent('km:answer', {
                bubbles: true,
                detail: { value: choice.value }
              }));
            }
          });
          modalChoices.appendChild(btn);
        }(q.choices[j]));
      }
    }
  }

  /* ---- Input ---- */
  function gameKeyDown(e) {
    if (modalOpen) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = true;
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = true;
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
      keys.jump = true;
      keys.jumpPressed = true;
      e.preventDefault();
    }
  }

  function gameKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.jump = false;
  }

  listen(document, 'keydown', gameKeyDown);
  listen(document, 'keyup', gameKeyUp);

  // Virtual buttons
  if (vbtnLeft) {
    listen(vbtnLeft, 'touchstart', function (e) { e.preventDefault(); keys.left = true; });
    listen(vbtnLeft, 'touchend', function () { keys.left = false; });
    listen(vbtnLeft, 'mousedown', function () { keys.left = true; });
    listen(vbtnLeft, 'mouseup', function () { keys.left = false; });
    listen(vbtnLeft, 'mouseleave', function () { keys.left = false; });
  }
  if (vbtnRight) {
    listen(vbtnRight, 'touchstart', function (e) { e.preventDefault(); keys.right = true; });
    listen(vbtnRight, 'touchend', function () { keys.right = false; });
    listen(vbtnRight, 'mousedown', function () { keys.right = true; });
    listen(vbtnRight, 'mouseup', function () { keys.right = false; });
    listen(vbtnRight, 'mouseleave', function () { keys.right = false; });
  }
  if (vbtnJump) {
    listen(vbtnJump, 'touchstart', function (e) { e.preventDefault(); keys.jump = true; keys.jumpPressed = true; });
    listen(vbtnJump, 'touchend', function () { keys.jump = false; });
    listen(vbtnJump, 'mousedown', function () { keys.jump = true; keys.jumpPressed = true; });
    listen(vbtnJump, 'mouseup', function () { keys.jump = false; });
    listen(vbtnJump, 'mouseleave', function () { keys.jump = false; });
  }

  /* ---- Contract methods ---- */
  function render(q) {
    currentQuestion = q || null;
    if (modalOpen && currentQuestion) {
      showModalQuestion(currentQuestion);
    }
  }

  function onWrong(choice) {
    wrongCount++;
    modalHint.style.display = 'block';
    if (wrongCount >= 3) {
      modalHint.textContent = 'Bé đếm lại từ đầu nhé! 💪';
    } else {
      modalHint.textContent = 'Thử lại nhé! Bé làm được mà 💪';
    }
  }

  function onCorrect(result) {
    closeModal();
    tap();
  }

  function celebrate() {
    root.classList.add('is-celebrate');
    // Simple celebration: flash player
    player.style.filter = 'brightness(1.5)';
    setTimeout(function () { player.style.filter = ''; }, 400);
  }

  function destroy() {
    running = false;
    if (KM.Games._active) KM.Games._active['mario-bros'] = null;
    if (KM.Games._intervalId === rafId) KM.Games._intervalId = null;
    if (rafId) { clearInterval(rafId); rafId = null; }
    clearListeners();
    if (root.parentNode) root.parentNode.removeChild(root);
    currentQuestion = null;
  }

  function handleKey(key) {
    var s = String(key);
    if (!/^[1-9]$/.test(s)) return false;
    if (!modalOpen) return false;
    var idx = parseInt(s, 10) - 1;
    var btns = modalChoices.querySelectorAll('button');
    if (!btns[idx]) return false;
    btns[idx].click();
    return true;
  }

  /* ---- Modal replay button ---- */
  listen(modalReplay, 'click', function () {
    // Shell handles TTS; we just dispatch a custom event for replay
    // For now, do nothing (shell's speakReplay button is above)
  });

  /* ---- Init ---- */
  // Clear previous instance
  if (KM.Games._intervalId) {
    clearInterval(KM.Games._intervalId);
    KM.Games._intervalId = null;
  }
  var instanceId = Math.random();
  if (!KM.Games._active) KM.Games._active = {};
  KM.Games._active['mario-bros'] = instanceId;
  showModalQuestion(null);
  modalOpen = false;
  paused = false;
  modal.style.display = 'none';
  lastTime = performance.now();
  rafId = setInterval(function() {
    if (KM.Games._active['mario-bros'] !== instanceId) {

      clearInterval(rafId);
      rafId = null;
      running = false;
      return;
    }
    var ts = performance.now();
    gameLoop(ts);
  }, 16);
  KM.Games._intervalId = rafId;

  return {
    render: render,
    onWrong: onWrong,
    onCorrect: onCorrect,
    celebrate: celebrate,
    destroy: destroy,
    handleKey: handleKey
  };

  /* ---- Helper: tile name ---- */
  function tileName(t) {
    if (t === 1) return 'ground';
    if (t === 2) return 'platform';
    if (t === 3) return 'hazard';
    if (t === 4) return 'coin';
    if (t === 5) return 'gate';
    if (t === 6) return 'exit';
    return 'empty';
  }
};

/* end of mario-bros.js */