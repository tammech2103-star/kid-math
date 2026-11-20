/**
 * Vẽ các loại visual của Question: nhóm đồ vật, hình học, sân khấu vị trí, phương trình.
 * @namespace KM.Visuals
 */
window.KM = window.KM || {};

KM.Visuals = (function () {
  'use strict';

  var el = KM.Components.el;
  var svg = KM.Components.svg;
  var C = KM.Curriculum;

  var INK = '#24344D';

  /** @returns {string} mã màu sáng/tối hơn */
  function shade(hex, percent) {
    var value = hex.replace('#', '');
    if (value.length === 3) {
      value = value.split('').map(function (ch) { return ch + ch; }).join('');
    }
    var num = parseInt(value, 16);
    var amount = Math.round(2.55 * percent);
    var r = Math.max(0, Math.min(255, (num >> 16) + amount));
    var g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    var b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  /**
   * Vẽ một hình/khối bằng SVG.
   * @param {string} kind
   * @param {{size?: number, color?: string, label?: string}} [options]
   * @returns {SVGElement}
   */
  function shapeSvg(kind, options) {
    var opts = options || {};
    var size = opts.size || 80;
    var color = opts.color || (C.shapes[kind] ? C.shapes[kind].color : '#FFD84D');
    var label = opts.label || (C.shapes[kind] ? C.shapes[kind].name : kind);
    var root = svg('svg', {
      viewBox: '0 0 100 100',
      width: size,
      height: size,
      class: 'shape-svg',
      role: 'img',
      'aria-label': label,
      focusable: 'false'
    });
    var stroke = { stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' };

    function add(tag, attrs) {
      var node = svg(tag, Object.assign({ fill: color }, stroke, attrs));
      root.appendChild(node);
      return node;
    }

    if (kind === 'square') {
      add('rect', { x: 15, y: 15, width: 70, height: 70, rx: 8 });
    } else if (kind === 'rectangle') {
      add('rect', { x: 6, y: 26, width: 88, height: 48, rx: 8 });
    } else if (kind === 'circle') {
      add('circle', { cx: 50, cy: 50, r: 40 });
      root.appendChild(svg('circle', {
        cx: 38, cy: 38, r: 7, fill: '#FFFFFF', opacity: '0.55'
      }));
    } else if (kind === 'triangle') {
      add('polygon', { points: '50,8 92,88 8,88' });
    } else if (kind === 'cube') {
      root.appendChild(svg('polygon', {
        points: '50,10 84,30 50,50 16,30', fill: shade(color, 22), stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
      root.appendChild(svg('polygon', {
        points: '16,30 50,50 50,90 16,70', fill: shade(color, -10), stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
      root.appendChild(svg('polygon', {
        points: '84,30 50,50 50,90 84,70', fill: color, stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
    } else if (kind === 'cuboid') {
      root.appendChild(svg('polygon', {
        points: '40,16 92,30 60,46 8,32', fill: shade(color, 22), stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
      root.appendChild(svg('polygon', {
        points: '8,32 60,46 60,80 8,66', fill: shade(color, -10), stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
      root.appendChild(svg('polygon', {
        points: '92,30 60,46 60,80 92,64', fill: color, stroke: INK,
        'stroke-width': 5, 'stroke-linejoin': 'round'
      }));
    }
    return root;
  }

  /**
   * @param {Array<object>} groups
   * @returns {HTMLElement}
   */
  function renderGroups(groups, operator) {
    var wrap = el('div', { class: 'visual-group' });
    var list = groups || [];
    list.forEach(function (group, index) {
      var panel = el('div', { class: 'group-panel' });
      if (group.label) {
        panel.appendChild(el('span', { class: 'group-label', text: group.label }));
      }
      if (group.masked) {
        panel.appendChild(el('div', { class: 'mask-box', text: '?' }));
      } else if (group.count === 0) {
        panel.appendChild(el('div', { class: 'empty-tray' }));
      } else {
        var row = el('div', { class: 'glyph-row' + (group.count > 5 ? ' is-dense' : '') });
        var crossed = group.crossedOut || 0;
        var i;
        for (i = 0; i < group.count; i += 1) {
          var crossedClass = i >= group.count - crossed ? ' is-crossed' : '';
          row.appendChild(el('span', {
            class: 'glyph' + crossedClass,
            text: group.glyph,
            'aria-hidden': 'true'
          }));
        }
        panel.appendChild(row);
      }
      wrap.appendChild(panel);
      if (operator && index < list.length - 1) {
        wrap.appendChild(el('span', {
          class: 'group-op',
          text: operator,
          'aria-hidden': 'true'
        }));
      }
    });
    return wrap;
  }

  /**
   * @param {object} visual
   * @returns {HTMLElement|null}
   */
  function render(visual) {
    if (!visual) {
      return null;
    }
    if (visual.kind === 'group' || visual.kind === 'groups') {
      return renderGroups(visual.groups, visual.operator);
    }
    if (visual.kind === 'shapes') {
      var stage = el('div', { class: 'stage' });
      (visual.items || []).forEach(function (item) {
        var holder = el('div', {
          class: 'stage-item',
          style: { left: item.x + '%', top: item.y + '%' }
        });
        holder.appendChild(shapeSvg(item.shape, {
          size: item.size || 64,
          color: item.color
        }));
        stage.appendChild(holder);
      });
      return stage;
    }
    if (visual.kind === 'scene') {
      var scene = el('div', { class: 'scene' });
      scene.appendChild(el('div', { class: 'scene-base', text: visual.base.glyph, 'aria-hidden': 'true' }));
      scene.appendChild(el('div', {
        class: 'scene-item scene-item-' + visual.rel,
        text: visual.item.glyph,
        'aria-hidden': 'true'
      }));
      scene.appendChild(el('div', { class: 'scene-floor', 'aria-hidden': 'true' }));
      return scene;
    }
    if (visual.kind === 'sequence') {
      var row = el('div', { class: 'sequence' });
      (visual.values || []).forEach(function (value) {
        if (value == null) {
          row.appendChild(el('span', { class: 'seq-chip seq-slot', text: '?', 'aria-label': 'ô trống' }));
        } else {
          row.appendChild(el('span', { class: 'seq-chip', text: String(value) }));
        }
      });
      return row;
    }
    return null;
  }

  /**
   * @param {{tokens: Array<object>, alt: string}} equation
   * @returns {HTMLElement|null}
   */
  function renderEquation(equation) {
    if (!equation || !equation.tokens) {
      return null;
    }
    var wrap = el('div', { class: 'equation' });
    equation.tokens.forEach(function (token) {
      if (token.type === 'slot') {
        wrap.appendChild(el('span', { class: 'slot', text: '?', 'aria-label': 'ô trống' }));
      } else {
        wrap.appendChild(el('span', {
          class: 'token token-' + token.type,
          text: token.value,
          'aria-hidden': 'true'
        }));
      }
    });
    return wrap;
  }

  return {
    shapeSvg: shapeSvg,
    render: render,
    renderEquation: renderEquation
  };
}());
