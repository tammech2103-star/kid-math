/**
 * DOM helpers và thành phần dùng chung: sao, confetti, xe thưởng, toast.
 * @namespace KM.Components
 */
window.KM = window.KM || {};

KM.Components = (function () {
  'use strict';

  var CAR_SRC = 'Asset/car1.webp';
  var CONFETTI_COLORS = ['#FFD84D', '#FF6B5B', '#6FE3B8', '#7ED3F7', '#9C7BF5', '#FF9F1C'];
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Tạo phần tử DOM.
   * @param {string} tag
   * @param {object} [attrs] class, text, style, on, dataset, aria-*, ...
   * @param {Array|Node|string} [children]
   * @returns {HTMLElement}
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) {
          return;
        }
        if (key === 'class') {
          node.className = value;
        } else if (key === 'text') {
          node.textContent = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.keys(value).forEach(function (prop) {
            node.style.setProperty(prop, value[prop]);
          });
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.keys(value).forEach(function (prop) {
            node.dataset[prop] = value[prop];
          });
        } else if (key === 'on' && typeof value === 'object') {
          Object.keys(value).forEach(function (eventName) {
            node.addEventListener(eventName, value[eventName]);
          });
        } else if (value === true) {
          node.setAttribute(key, '');
        } else {
          node.setAttribute(key, value);
        }
      });
    }
    append(node, children);
    return node;
  }

  /** @param {Node} node @param {Array|Node|string} children */
  function append(node, children) {
    if (children == null) {
      return;
    }
    if (Array.isArray(children)) {
      children.forEach(function (child) {
        append(node, child);
      });
      return;
    }
    if (children instanceof Node) {
      node.appendChild(children);
    } else {
      node.appendChild(document.createTextNode(String(children)));
    }
  }

  /** @param {Node} node */
  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  /**
   * Tạo thẻ SVG.
   * @param {string} tag
   * @param {object} attrs
   * @returns {SVGElement}
   */
  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  /**
   * Hàng 3 sao.
   * @param {number} value Số sao đạt được.
   * @param {{small?: boolean, animate?: boolean}} [options]
   * @returns {HTMLElement}
   */
  function stars(value, options) {
    var opts = options || {};
    var wrap = el('span', {
      class: 'stars' + (opts.small ? ' stars-small' : '') + (opts.animate ? ' stars-animate' : ''),
      role: 'img',
      'aria-label': value + ' trên 3 sao'
    });
    var i;
    for (i = 0; i < 3; i += 1) {
      var star = el('span', {
        class: 'star' + (i < value ? ' is-on' : ''),
        text: '⭐',
        'aria-hidden': 'true'
      });
      if (opts.animate && i < value) {
        star.style.setProperty('--delay', (i * 0.18) + 's');
      }
      wrap.appendChild(star);
    }
    return wrap;
  }

  /**
   * Bắn confetti rồi tự dọn.
   * @param {HTMLElement} host
   * @param {number} count
   * @param {number} [durationMs]
   */
  function confetti(host, count, durationMs) {
    var layer = el('div', { class: 'confetti-layer', 'aria-hidden': 'true' });
    var total = Math.max(0, Math.min(120, count || 40));
    var lifetime = durationMs || 2200;
    var i;
    for (i = 0; i < total; i += 1) {
      var size = 7 + Math.floor(Math.random() * 9);
      var piece = el('span', {
        class: 'confetti',
        style: {
          left: (Math.random() * 100) + '%',
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          width: size + 'px',
          height: (size * 1.6) + 'px',
          '--fall-duration': (1.1 + Math.random() * 0.9) + 's',
          '--fall-delay': (Math.random() * 0.35) + 's',
          '--fall-rotate': Math.floor(Math.random() * 360) + 'deg',
          '--fall-drift': (Math.random() * 120 - 60) + 'px'
        }
      });
      if (i % 4 === 0) {
        piece.style.borderRadius = '50%';
      }
      layer.appendChild(piece);
    }
    host.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
    }, lifetime);
    return layer;
  }

  /**
   * Màn ăn mừng ngắn: xe + sao + thông điệp, không chặn thao tác.
   * @param {HTMLElement} host
   * @param {{title?: string, sub?: string, duration?: number}} [options]
   * @returns {HTMLElement}
   */
  function carCelebration(host, options) {
    var opts = options || {};
    var duration = opts.duration || 1300;
    var overlay = el('div', { class: 'celebrate', role: 'status', 'aria-live': 'polite' }, [
      el('div', { class: 'celebrate-card' }, [
        el('div', { class: 'celebrate-copy' }, [
          el('strong', { class: 'celebrate-title', text: opts.title || 'Đúng rồi!' }),
          el('span', { class: 'celebrate-sub', text: opts.sub || '+1 ⭐' })
        ]),
        el('img', {
          class: 'celebrate-car',
          src: CAR_SRC,
          alt: 'Chiếc xe đua phần thưởng',
          draggable: 'false'
        })
      ])
    ]);
    host.appendChild(overlay);
    window.setTimeout(function () {
      overlay.classList.add('is-leaving');
    }, Math.max(200, duration - 220));
    window.setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, duration);
    return overlay;
  }

  /**
   * Thông báo nhỏ ở đầu màn hình.
   * @param {string} message
   * @param {{tone?: string, duration?: number}} [options]
   */
  function toast(message, options) {
    var opts = options || {};
    var existing = document.querySelector('.toast');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    var node = el('div', {
      class: 'toast' + (opts.tone ? ' toast-' + opts.tone : ''),
      role: 'status',
      text: message
    });
    document.body.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-leaving');
    }, opts.duration || 2000);
    window.setTimeout(function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }, (opts.duration || 2000) + 320);
  }

  /** Rung nhẹ một phần tử khi trả lời sai. */
  function shake(node) {
    if (!node) {
      return;
    }
    node.classList.remove('is-shaking');
    void node.offsetWidth;
    node.classList.add('is-shaking');
    window.setTimeout(function () {
      node.classList.remove('is-shaking');
    }, 480);
  }

  /** Xoá thông báo đang hiển thị (nếu có). */
  function dismissToast() {
    var existing = document.querySelector('.toast');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  /**
   * Dãy chấm tiến độ câu hỏi.
   * @param {number} total
   * @param {number} index
   * @returns {HTMLElement}
   */
  function progressDots(total, index) {
    var wrap = el('div', { class: 'dots', role: 'img', 'aria-label': 'Câu ' + (index + 1) + ' trên ' + total });
    var i;
    for (i = 0; i < total; i += 1) {
      var state = i < index ? ' is-done' : (i === index ? ' is-current' : '');
      wrap.appendChild(el('span', { class: 'dot' + state }));
    }
    return wrap;
  }

  /**
   * Nút tròn có icon, dùng cho đầu màn hình.
   * @param {{icon: string, label: string, onClick: Function, pressed?: boolean}} options
   * @returns {HTMLButtonElement}
   */
  function iconButton(options) {
    var button = el('button', {
      class: 'icon-btn',
      type: 'button',
      'aria-label': options.label,
      title: options.label,
      'aria-pressed': options.pressed ? 'true' : 'false',
      on: { click: options.onClick }
    }, [
      el('span', { class: 'icon-btn-glyph', text: options.icon, 'aria-hidden': 'true' })
    ]);
    if (options.pressed === false) {
      button.classList.add('is-muted');
    }
    return button;
  }

  return {
    CAR_SRC: CAR_SRC,
    el: el,
    append: append,
    clear: clear,
    svg: svg,
    stars: stars,
    confetti: confetti,
    carCelebration: carCelebration,
    toast: toast,
    dismissToast: dismissToast,
    shake: shake,
    progressDots: progressDots,
    iconButton: iconButton
  };
}());
