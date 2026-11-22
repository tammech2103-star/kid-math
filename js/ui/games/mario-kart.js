/**
 * b20 / mario-kart — "Đường vải tới trường" (giữ nguyên slug/tên file theo
 * game-map.js; nội dung là xếp ô đường, không có phương tiện hay bảng xếp hạng).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #21, mục chi tiết bài 21)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 *
 * lockedCount được CỘNG DỒN trong suốt vòng đời module: render(q) KHÔNG reset
 * số ô đã khoá, chỉ xoá và vẽ lại widget của câu hiện tại. Module không biết
 * index câu trừ khi shell truyền options.index (0-based); nếu không có, dùng
 * lockedCount làm ô đang xếp. Tổng số ô lấy từ KM.Curriculum.questionCount(lesson),
 * fallback q.total rồi 10 khi không có API.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-kart'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var q = opts.question || null;
  var destroyed = false;
  var locked = false;
  var timers = [];
  var listeners = [];
  var tiles = [];
  var lockedCount = 0;
  var activeIndex = 0;
  var pendingIndex = 0;
  var finished = false;
  var ROW_SIZE = 5;

  var roadTiles = function () {
    var api = window.KM && KM.Curriculum;
    var lesson = opts.lesson;
    var count;
    if (api && typeof api.questionCount === 'function') {
      if (!lesson && typeof api.getLesson === 'function') {
        lesson = api.getLesson('b20');
      }
      count = api.questionCount(lesson, window.KM && KM.Tuning);
      if (typeof count === 'number' && isFinite(count) && count > 0) {
        return Math.floor(count);
      }
    }
    if (q && q.total != null && isFinite(Number(q.total)) && Number(q.total) > 0) {
      return Math.floor(Number(q.total));
    }
    return 10;
  }();
  var totalTiles = roadTiles;

  var root = document.createElement('div');
  root.className = 'kmg-mario-kart' + (reduced ? ' is-reduced' : '');
  if (mount) {
    mount.appendChild(root);
  }

  function text(value) {
    return typeof window.tr === 'function' ? window.tr(value) : value;
  }

  function append(host, kids) {
    if (kids == null) {
      return;
    }
    if (Array.isArray(kids)) {
      kids.forEach(function (kid) { append(host, kid); });
    } else if (kids && kids.nodeType) {
      host.appendChild(kids);
    } else {
      host.appendChild(document.createTextNode(String(kids)));
    }
  }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (key) {
      var value = a[key];
      if (value == null || value === false) {
        return;
      }
      if (key === 'class') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) { node.style[prop] = value[prop]; });
      } else {
        node.setAttribute(key, value === true ? '' : String(value));
      }
    });
    append(node, kids);
    return node;
  }

  function btn(extraClass, attrs) {
    var node = el('button', attrs || {});
    node.type = 'button';
    node.className = 'kmg-btn kmg-mario-kart__' + extraClass;
    node.style.minWidth = '64px';
    node.style.minHeight = '64px';
    return node;
  }

  function on(target, type, fn) {
    if (!target) {
      return;
    }
    target.addEventListener(type, fn, false);
    listeners.push({ target: target, type: type, fn: fn });
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
  }

  function tune(key, fallback) {
    var game = (window.KM && KM.Tuning && KM.Tuning.game) || {};
    var value = game[key];
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function tap() {
    if (audio && typeof audio.tap === 'function') {
      try { audio.tap(); } catch (error) { /* hiệu ứng không chặn trả lời */ }
    }
  }

  function find(question, value) {
    var list;
    var i;
    if (!question || value == null) {
      return null;
    }
    list = question.choices || [];
    for (i = 0; i < list.length; i += 1) {
      if (String(list[i].value) === String(value)) {
        return list[i];
      }
    }
    return null;
  }

  function submit(value) {
    var found;
    if (destroyed || locked || finished) {
      return false;
    }
    found = find(q, value);
    if (!found) {
      hintNode.textContent = text('Bé chọn lại nhé!');
      return false;
    }
    locked = true;
    root.classList.add('is-picked');
    pendingIndex = activeIndex;
    mount.dispatchEvent(new CustomEvent('km:answer', {
      bubbles: true,
      detail: { value: found.value }
    }));
    return true;
  }

  function svgShape(kind, label) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    var shape;
    var colors = {
      square: '#FF8A5B', circle: '#4FC3F7', triangle: '#FFD84D',
      rectangle: '#9C7BF5', cube: '#6FE3B8', cuboid: '#FFB020'
    };
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', '56');
    svg.setAttribute('height', '56');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label || kind || text('hình'));
    shape = document.createElementNS(ns, kind === 'circle' ? 'circle' : 'polygon');
    shape.setAttribute('fill', colors[kind] || '#FF8A5B');
    if (kind === 'circle') {
      shape.setAttribute('cx', '32');
      shape.setAttribute('cy', '32');
      shape.setAttribute('r', '23');
    } else if (kind === 'square') {
      shape.setAttribute('points', '10,10 54,10 54,54 10,54');
    } else if (kind === 'triangle') {
      shape.setAttribute('points', '32,8 58,56 6,56');
    } else if (kind === 'rectangle') {
      shape.setAttribute('points', '5,18 59,18 59,46 5,46');
    } else if (kind === 'cuboid') {
      shape.setAttribute('points', '4,22 42,12 60,22 22,32 22,52 4,42 42,32 60,42 42,52');
    } else {
      shape.setAttribute('points', '10,20 32,8 54,20 32,32 10,20 10,48 32,60 54,48 32,32');
    }
    svg.appendChild(shape);
    return svg;
  }

  var promptNode = el('p', { class: 'kmg-mario-kart__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#6b5136'
  } });

  var topRow = el('div', { class: 'kmg-mario-kart__top', style: {
    display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap'
  } });
  var bottomRow = el('div', { class: 'kmg-mario-kart__bottom', style: {
    display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: '8px', flexWrap: 'nowrap'
  } });
  var roadNode = el('div', { class: 'kmg-mario-kart__road', style: {
    display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px',
    borderRadius: '22px', overflowX: 'auto',
    background: 'linear-gradient(180deg, #fff6e4, #e9dcc4)', border: '3px solid #c8a87d'
  } }, [topRow, bottomRow]);

  var bannerNode = el('p', {
    class: 'kmg-mario-kart__banner', 'aria-live': 'polite',
    style: { display: 'none', margin: '8px 0 0', fontWeight: '900', fontSize: '1.2rem', color: '#2f7045' }
  });
  bannerNode.appendChild(el('span', { text: '✓ ', 'aria-hidden': 'true' }));
  bannerNode.appendChild(el('span', { text: text('Đến trường rồi!') }));

  var hintNode = el('p', {
    class: 'kmg-mario-kart__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#6b5136' }
  });

  root.appendChild(promptNode);
  root.appendChild(roadNode);
  root.appendChild(bannerNode);
  root.appendChild(hintNode);

  function makeTile(index) {
    var mark = el('span', {
      class: 'kmg-mario-kart__mark', text: String(index + 1),
      style: { fontWeight: '900', fontSize: '1.1rem', color: '#8b6b45' }
    });
    var host = el('div', {
      class: 'kmg-mario-kart__widget',
      style: { display: 'none', width: '100%' }
    });
    var box = el('div', {
      class: 'kmg-mario-kart__tile',
      'data-road-tile': String(index),
      'aria-label': text('Ô đường thứ ' + (index + 1)),
      style: {
        flex: '0 0 auto', minWidth: '96px', minHeight: '96px', borderRadius: '14px',
        border: '3px dashed #b89b6d', background: '#fffaf0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '6px', padding: '8px'
      }
    }, [mark, host]);
    tiles.push({ root: box, mark: mark, host: host });
    return box;
  }

  function buildRoad() {
    var topCount = Math.ceil(totalTiles / 2);
    var i;
    topRow.textContent = '';
    bottomRow.textContent = '';
    tiles = [];
    topRow.appendChild(el('span', { 'aria-hidden': 'true', text: '🏠', style: { fontSize: '2.2rem' } }));
    for (i = 0; i < topCount; i += 1) {
      topRow.appendChild(makeTile(i));
    }
    for (i = topCount; i < totalTiles; i += 1) {
      bottomRow.appendChild(makeTile(i));
    }
    bottomRow.appendChild(el('span', { 'aria-hidden': 'true', text: '🏫', style: { fontSize: '2.2rem' } }));
  }

  function clearTile(entry) {
    entry.root.classList.remove('is-current');
    entry.root.style.border = '';
    entry.root.style.background = '';
    entry.root.style.minWidth = '';
    entry.root.style.minHeight = '';
    entry.host.style.display = 'none';
    entry.host.textContent = '';
    if (!entry.root.classList.contains('is-locked')) {
      entry.mark.textContent = String(Number(entry.root.getAttribute('data-road-tile')) + 1);
    }
  }

  function requestedIndex() {
    var keys = ['index', 'questionIndex', 'questionNumber', 'stepIndex'];
    var value;
    var i;
    for (i = 0; i < keys.length; i += 1) {
      value = opts[keys[i]];
      if (typeof value === 'number' && isFinite(value)) {
        return Math.max(0, Math.floor(value));
      }
    }
    if (q && typeof q.index === 'number' && isFinite(q.index)) {
      return Math.max(0, Math.floor(q.index));
    }
    return lockedCount;
  }

  function pickActiveTile() {
    var wanted = requestedIndex();
    var start;
    var i;
    var entry;
    if (wanted >= totalTiles) {
      wanted = lockedCount;
    }
    start = wanted % totalTiles;
    for (i = 0; i < totalTiles; i += 1) {
      entry = tiles[(start + i) % totalTiles];
      if (entry && !entry.root.classList.contains('is-locked')) {
        return (start + i) % totalTiles;
      }
    }
    return -1;
  }

  function formRow(glyph, count, crossed) {
    var row = el('div', { class: 'kmg-mario-kart__objects', 'aria-hidden': 'true', style: {
      display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center',
      maxWidth: '260px', fontSize: '1.1rem'
    } });
    var i;
    for (i = 0; i < Math.max(0, Math.min(10, count)); i += 1) {
      row.appendChild(el('span', { text: (crossed && i < crossed ? '̶' : '') + (glyph || '🍎') }));
    }
    if (!count) {
      row.appendChild(el('span', { text: text('0 quả'), style: { fontSize: '0.8rem' } }));
    }
    return row;
  }

  function equationRow(question) {
    var row = el('div', { class: 'kmg-mario-kart__equation', style: {
      fontWeight: '900', fontSize: '1.1rem', color: '#5b4632', textAlign: 'center'
    } });
    var tokens = (question && question.equation && question.equation.tokens) || [];
    if (!tokens.length) {
      row.textContent = (question && question.text) || '';
      return row;
    }
    tokens.forEach(function (token) {
      row.appendChild(el('span', { text: (token.type === 'slot' ? '?' : token.value) + ' ' }));
    });
    return row;
  }

  function groupList(question) {
    return (question && question.visual && question.visual.groups) || [];
  }

  function addOptions(host, question, mode) {
    var list = (question && question.choices) || [];
    var row = el('div', { class: 'kmg-mario-kart__opts', style: {
      display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px'
    } });
    list.forEach(function (choice, index) {
      var label = choice.aria || choice.label || String(choice.value);
      var option = btn('opt', {
        'data-road-opt': String(index),
        'aria-label': text(label)
      });
      option.style.borderRadius = '12px';
      option.style.background = '#fffdf7';
      option.style.padding = '4px 8px';
      option.style.fontWeight = '900';
      option.style.fontSize = '1rem';
      if (mode === 'shape' && choice.shape) {
        option.appendChild(svgShape(choice.shape, label));
      } else if (mode === 'arrow') {
        option.appendChild(el('span', { text: choice.icon || String(choice.value), style: { fontSize: '1.4rem' } }));
      } else if (mode === 'glyph') {
        option.appendChild(el('span', { text: choice.glyph || label, style: { fontSize: '1.5rem' } }));
      } else {
        option.appendChild(document.createTextNode(String(choice.label != null ? choice.label : choice.value)));
      }
      row.appendChild(option);
    });
    host.appendChild(row);
  }

  function widgetFor(host, question) {
    var kind = (question && question.kind) || '';
    var groups = groupList(question);
    var scene;
    var items;
    var visual;
    var i;

    if (kind === 'count') {
      host.appendChild(formRow(groups[0] && groups[0].glyph, groups[0] && groups[0].count));
      addOptions(host, question, 'number');
    } else if (kind === 'compareGroups') {
      for (i = 0; i < groups.length; i += 1) {
        host.appendChild(el('div', { text: groups[i].label || ('Nhóm ' + (i + 1)), style: { fontSize: '0.8rem', fontWeight: '800' } }));
        host.appendChild(formRow(groups[i].glyph, groups[i].count));
      }
      addOptions(host, question, 'text');
    } else if (kind === 'compareSign' || kind === 'factFamily') {
      host.appendChild(equationRow(question));
      addOptions(host, question, question && question.choiceRender === 'sign' ? 'text' : 'number');
    } else if (kind === 'compose' || kind === 'add') {
      for (i = 0; i < groups.length; i += 1) {
        host.appendChild(formRow(groups[i].glyph, groups[i].masked ? 0 : groups[i].count));
      }
      addOptions(host, question, 'number');
    } else if (kind === 'subtract') {
      host.appendChild(formRow(groups[0] && groups[0].glyph, groups[0] && groups[0].count, groups[0] && groups[0].crossedOut));
      addOptions(host, question, 'number');
    } else if (kind === 'sequence') {
      visual = (question && question.visual && question.visual.values) || [];
      host.appendChild(el('div', { 'aria-hidden': 'true', style: { display: 'flex', gap: '4px', justifyContent: 'center' } },
        visual.map(function (value) {
          return el('span', {
            text: value == null ? '?' : String(value),
            style: { minWidth: '34px', textAlign: 'center', fontWeight: '900', fontSize: '1.1rem' }
          });
        })));
      addOptions(host, question, 'number');
    } else if (kind === 'shape2d') {
      items = ((question && question.visual && question.visual.items) || []).slice(0, 8);
      if (items.length) {
        host.appendChild(el('div', { 'aria-hidden': 'true', style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center' } },
          items.map(function (item) { return svgShape(item.shape, ''); })));
      }
      addOptions(host, question, question && question.choiceRender === 'shape' ? 'shape' : 'number');
    } else if (kind === 'solid3d') {
      addOptions(host, question, question && question.choiceRender === 'glyph' ? 'glyph' : 'shape');
    } else if (kind === 'position') {
      scene = (question && question.visual) || {};
      host.appendChild(el('div', {
        'aria-hidden': 'true',
        text: (scene.item && scene.item.glyph || '⚽') + ' 📦',
        style: { textAlign: 'center', fontSize: '1.5rem' }
      }));
      host.appendChild(el('div', {
        text: text('Hướng: ' + (scene.rel || '')),
        style: { textAlign: 'center', fontSize: '0.8rem', fontWeight: '800' }
      }));
      addOptions(host, question, 'arrow');
    } else {
      host.appendChild(el('div', { text: (question && question.text) || '', style: { fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' } }));
      addOptions(host, question, 'text');
    }
  }

  function drawCurrent() {
    tiles.forEach(function (entry) { clearTile(entry); });
    if (finished) {
      activeIndex = -1;
      return;
    }
    activeIndex = pickActiveTile();
    if (activeIndex < 0) {
      return;
    }
    var entry = tiles[activeIndex];
    entry.root.classList.add('is-current');
    entry.root.style.border = '3px solid #d98b3b';
    entry.root.style.background = '#fffdf5';
    entry.root.style.minWidth = '300px';
    entry.root.style.minHeight = '190px';
    entry.mark.textContent = '✎';
    entry.host.style.display = 'block';
    entry.host.textContent = '';
    widgetFor(entry.host, q);
  }

  function updateBanner() {
    if (lockedCount >= totalTiles) {
      finished = true;
      bannerNode.style.display = 'block';
      root.classList.add('is-arrived');
    } else {
      bannerNode.style.display = 'none';
      root.classList.remove('is-arrived');
    }
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    clearTimers();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked');
    promptNode.textContent = (q && q.text) || '';
    hintNode.textContent = text('Bé xếp đúng ô đường để đi tới trường nhé!');
    updateBanner();
    drawCurrent();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed || finished) {
      return;
    }
    if (activeIndex < 0) {
      return;
    }
    submit(choice.value);
  }

  on(roadNode, 'click', function (event) {
    var target = event.target;
    var option = null;
    var tile = null;
    while (target && target !== roadNode) {
      if (!option && target.getAttribute && target.getAttribute('data-road-opt') != null) {
        option = target;
      }
      if (!tile && target.getAttribute && target.getAttribute('data-road-tile') != null) {
        tile = target;
      }
      target = target.parentNode;
    }
    tap();
    if (option && tile && tile.classList.contains('is-current')) {
      activate(Number(option.getAttribute('data-road-opt')));
      return;
    }
    if (tile && tile.classList.contains('is-locked')) {
      hintNode.textContent = text('Ô này xong rồi nhé!');
      return;
    }
    hintNode.textContent = text('Bé bấm vào số trong ô đang xếp nhé!');
  });

  function onWrong() {
    if (destroyed) {
      return;
    }
    clearTimers();
    root.classList.remove('is-correct', 'is-picked');
    root.classList.add('is-wrong');
    if (activeIndex >= 0) {
      tiles[activeIndex].root.classList.add('is-wrong-tile');
      later(function () {
        if (activeIndex >= 0 && tiles[activeIndex]) {
          tiles[activeIndex].root.classList.remove('is-wrong-tile');
        }
      }, reduced ? 0 : tune('wrongShakeMs', 360));
    }
    locked = false;
    drawCurrent();
    hintNode.textContent = text('Ô rung nhẹ. Bé thử lại ô này nhé!');
  }

  function onCorrect() {
    if (destroyed) {
      return;
    }
    var index = pendingIndex;
    var entry;
    if (finished) {
      return;
    }
    if (index < 0 || index >= totalTiles) {
      index = activeIndex;
    }
    entry = tiles[index];
    if (entry && !entry.root.classList.contains('is-locked')) {
      entry.root.classList.add('is-locked');
      entry.root.classList.remove('is-current', 'is-wrong-tile');
      entry.root.style.border = '3px solid #58a86b';
      entry.root.style.background = '#dff3df';
      entry.root.style.minWidth = '96px';
      entry.root.style.minHeight = '96px';
      entry.mark.textContent = '✓';
      entry.host.style.display = 'none';
      entry.host.textContent = '';
      lockedCount += 1;
    }
    root.classList.add('is-correct');
    root.classList.remove('is-wrong');
    updateBanner();
  }

  function celebrate() {
    if (destroyed) {
      return;
    }
    root.classList.add('is-celebrate');
    if (finished && totalTiles > 0 && tiles[totalTiles - 1]) {
      tiles[totalTiles - 1].root.classList.add('is-arrived');
    }
    later(function () { root.classList.remove('is-celebrate'); }, tune('celebrateMs', 900));
  }

  function handleKey(key) {
    var digit = String(key);
    var index;
    if (!/^[1-9]$/.test(digit) || !q || !q.choices) {
      return false;
    }
    index = Number(digit) - 1;
    if (index >= q.choices.length || locked || destroyed || finished) {
      return false;
    }
    tap();
    activate(index);
    return true;
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    clearTimers();
    listeners.forEach(function (entry) {
      entry.target.removeEventListener(entry.type, entry.fn, false);
    });
    listeners = [];
    tiles = [];
    root.className = '';
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  buildRoad();
  render(q);
  return {
    render: render,
    onWrong: onWrong,
    onCorrect: onCorrect,
    celebrate: celebrate,
    handleKey: handleKey,
    destroy: destroy
  };
};
