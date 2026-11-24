/**
 * Kid Math Retro - Choi game, hoc toan.
 * EmulatorJS-based game player voi question-gate va netplay 2 nguoi.
 * @namespace KM
 */
window.KM = window.KM || {};

KM.App = (function () {
  'use strict';

  var el = function (tag, attrs, kids) {
    var n = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      if (k === 'class') n.className = a[k];
      else if (k === 'text') n.textContent = a[k];
      else if (k === 'on') {
        Object.keys(a[k]).forEach(function (ev) {
          n.addEventListener(ev, a[k][ev], false);
        });
      } else if (k === 'style' && typeof a[k] === 'object') {
        Object.keys(a[k]).forEach(function (s) { n.style[s] = a[k][s]; });
      } else {
        n.setAttribute(k, a[k]);
      }
    });
    if (kids != null) {
      if (Array.isArray(kids)) kids.forEach(function (k) { append(n, k); });
      else if (kids && kids.nodeType) n.appendChild(kids);
      else n.appendChild(document.createTextNode(String(kids)));
    }
    return n;
  };

  function append(host, kids) {
    if (kids == null) return;
    if (Array.isArray(kids)) kids.forEach(function (k) { append(host, k); });
    else if (kids && kids.nodeType) host.appendChild(kids);
    else host.appendChild(document.createTextNode(String(kids)));
  }

  // State
  var currentLevel = 1;
  var currentQuestionIndex = 0;
  var currentQuestions = [];
  var currentLesson = null;
  var questionTimer = null;
  var questionTimeLeft = 300;
  var emulator = null;
  var gameRunning = false;
  var modalOpen = false;
  var wrongCount = 0;
  var questionLocked = false;
  var activeQuestion = null;
  var audio = null;
  var audioCtx = null;
  var settings = { speech: true, sfx: true };
  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // Netplay state
  var netplayMode = 'single'; // single | host | guest
  var netplayRoomCode = '';
  var netplayPassword = '';
  var netplayRelayUrl = (window.KM_NETPLAY_RELAY || localStorage.getItem('km_netplay_relay') || 'https://kid-math-rom-relay.onrender.com').replace(/\/$/, '');
  var netplayServerUrl = (window.KM_NETPLAY_SERVER || localStorage.getItem('km_netplay_server') || 'https://kid-math-netplay.onrender.com').replace(/\/$/, '');
  var netplayGameId = 1;
  var netplayDeadline = 0;
  var netplayGuestAnswerLocked = false;
  var netplayHandlersBound = false;
  var netplayStatusEl = null;
  var netplayHostStatusEl = null;
  var fastForwardOn = false;

  function isNetplayActive() {
    return netplayMode !== 'single' && window.EJS_emulator && window.EJS_emulator.isNetplay;
  }

  function netplay() {
    return window.EJS_emulator ? window.EJS_emulator.netplay : null;
  }

  function netplayOwner() {
    return netplayMode === 'host' && isNetplayActive() && window.EJS_emulator.netplay.owner;
  }

  // Question progression
  function getLessonForLevel(level) {
    var idx = (level - 1) % 21;
    var lessons = [];
    if (KM.Curriculum && KM.Curriculum.chapters) {
      KM.Curriculum.chapters.forEach(function (ch) {
        ch.lessons.forEach(function (l) { lessons.push(l); });
      });
    }
    return lessons[idx] || (lessons.length ? lessons[0] : null);
  }

  function loadQuestionsForLevel(level) {
    var lesson = getLessonForLevel(level);
    currentLesson = lesson;
    if (KM.Questions && KM.Questions.forLesson && lesson) {
      var rng = {
        int: function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
        shuffle: function (arr) { return arr.slice().sort(function () { return Math.random() - 0.5; }); },
        pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
        chance: function (prob) { return Math.random() < prob; }
      };
      currentQuestions = KM.Questions.forLesson(lesson, rng, KM.Tuning);
      currentQuestionIndex = 0;
    }
    return currentQuestions.length > 0 ? currentQuestions[0] : null;
  }

  function getCurrentQuestion() {
    if (currentQuestions.length === 0) {
      loadQuestionsForLevel(currentLevel);
    }
    if (currentQuestionIndex >= currentQuestions.length) {
      currentLevel++;
      if (currentLevel > 31) currentLevel = 1;
      loadQuestionsForLevel(currentLevel);
    }
    return currentQuestions[currentQuestionIndex] || null;
  }

  // Console auto-detect
  function detectConsole(file) {
    var name = file.name.toLowerCase();
    var ext = name.split('.').pop();
    var map = {
      'nes': 'nes', 'fds': 'nes',
      'snes': 'snes9x', 'smc': 'snes9x', 'sfc': 'snes9x', 'fig': 'snes9x',
      'gb': 'gambatte',
      'gbc': 'gambatte',
      'gba': 'mgba',
      'md': 'genesis_plus_gx', 'gen': 'genesis_plus_gx', 'bin': 'genesis_plus_gx', 'smd': 'genesis_plus_gx',
      'n64': 'mupen64plus_next', 'z64': 'mupen64plus_next', 'v64': 'mupen64plus_next',
      'cue': 'pcsx_rearmed', 'iso': 'pcsx_rearmed', 'chd': 'pcsx_rearmed', 'pbp': 'pcsx_rearmed',
      'nds': 'desmume', 'dsi': 'desmume',
      'pce': 'mednafen_pce_fast', 'sgx': 'mednafen_pce_fast',
      'ngp': 'mednafen_ngp', 'ngc': 'mednafen_ngp',
      'ws': 'mednafen_wswan', 'wsc': 'mednafen_wswan',
      'a26': 'stella', 'a78': 'prosystem',
      'col': 'bluemsx', 'msx': 'bluemsx',
      'int': 'freeintv', 'jag': 'virtualjaguar', 'lnx': 'handy',
      '32x': 'picodrive', 'scummvm': 'scummvm'
    };
    return map[ext] || null;
  }

  function hashRomFile(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var bytes = new Uint8Array(e.target.result);
      var h = 2166136261 >>> 0;
      for (var i = 0; i < bytes.length; i++) {
        h ^= bytes[i];
        h = Math.imul(h, 16777619) >>> 0;
      }
      cb(h || 1);
    };
    reader.onerror = function () { cb(1); };
    reader.readAsArrayBuffer(file);
  }

  // Audio unlock (mobile)
  function unlockAudio() {
    if (!audioCtx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        try { audioCtx = new Ctor(); } catch (e) { audioCtx = null; }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (audio && typeof audio.unlock === 'function') audio.unlock();
  }

  function waitForEmulator(cb, attempts) {
    attempts = attempts || 0;
    if (window.EJS_emulator) { cb(); return; }
    if (attempts > 150) return;
    setTimeout(function () { waitForEmulator(cb, attempts + 1); }, 200);
  }

  function disableWakeLock() {
    try {
      if (navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
        Object.defineProperty(navigator, 'wakeLock', {
          configurable: true,
          value: {
            request: function () {
              return Promise.resolve({
                release: function () {},
                addEventListener: function () {},
                removeEventListener: function () {}
              });
            }
          }
        });
      }
    } catch (e) { /* ignore */ }
  }

  // Init EmulatorJS
  function initEmulator(romFile, core) {
    disableWakeLock();
    var container = document.getElementById('emulator-container');
    container.innerHTML = '';

    var emuDiv = document.getElementById('emulator');
    emuDiv.style.display = 'block';
    container.appendChild(emuDiv);

    window.EJS_player = '#emulator';
    window.EJS_core = core;
    window.EJS_pathtodata = 'https://cdn.emulatorjs.org/nightly/data/';
    window.EJS_startOnLoaded = true;
    window.EJS_volume = 0.5;
    window.EJS_touch = false;
    window.EJS_netplayServer = netplayServerUrl;
    window.EJS_netplayICEServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
    ];
    window.EJS_gameID = netplayGameId;

    var reader = new FileReader();
    reader.onload = function (e) {
      window.EJS_gameUrl = e.target.result;
      var script = document.createElement('script');
      script.src = 'https://cdn.emulatorjs.org/nightly/data/loader.js';
      script.onload = function () {
        waitForEmulator(function () {
          emulator = window.EJS_emulator;
          gameRunning = true;

          if (netplayMode === 'single') {
            startQuestionTimer();
          }

          disableEmulatorAutoMenu();
          setTimeout(disableEmulatorAutoMenu, 1500);

          if (netplayMode !== 'single') {
            startNetplayAfterLoad();
          }
        });
      };
      document.body.appendChild(script);
    };
    reader.readAsDataURL(romFile);
  }

  // Question timer
  function startQuestionTimer() {
    if (questionTimer) clearInterval(questionTimer);
    questionTimeLeft = 300;
    questionTimer = setInterval(function () {
      if (modalOpen) return;
      questionTimeLeft--;
      updateTimerDisplay();
      if (questionTimeLeft <= 0) {
        showQuestion();
      }
    }, 1000);
  }

  function startNetplayGuestTimer() {
    if (questionTimer) clearInterval(questionTimer);
    questionTimeLeft = 300;
    questionTimer = setInterval(function () {
      if (modalOpen) return;
      var left = Math.max(0, Math.ceil((netplayDeadline - Date.now()) / 1000));
      questionTimeLeft = left;
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    var timerEl = document.getElementById('timer');
    if (timerEl) {
      var mins = Math.floor(questionTimeLeft / 60);
      var secs = questionTimeLeft % 60;
      timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
  }

  // Render a question into the modal without changing pause/timer state.
  function renderQuestion(question, hintText) {
    if (!question) return;
    activeQuestion = question;
    questionLocked = false;

    document.getElementById('question-text').textContent = question.text;

    var visualEl = document.getElementById('question-visual');
    if (visualEl) {
      visualEl.innerHTML = '';
      if (question.visual && question.visual.groups) {
        question.visual.groups.forEach(function (group) {
          var g = group.count || 0;
          var glyph = group.glyph || '🍎';
          var row = document.createElement('div');
          row.className = 'question-visual-group';
          for (var i = 0; i < g; i++) {
            var span = document.createElement('span');
            span.className = 'question-visual-item';
            span.textContent = glyph;
            row.appendChild(span);
          }
          visualEl.appendChild(row);
        });
      }
    }

    var choicesEl = document.getElementById('question-choices');
    choicesEl.innerHTML = '';
    question.choices.forEach(function (choice) {
      var btn = el('button', {
        class: 'question-choice',
        text: choice.label != null ? choice.label : String(choice.value),
        on: { click: function () { answerQuestion(choice.value, question); } }
      });
      btn.dataset.value = String(choice.value);
      choicesEl.appendChild(btn);
    });

    var hint = document.getElementById('question-hint');
    hint.textContent = hintText || '';
    hint.style.display = hintText ? 'block' : 'none';

    if (settings.speech && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      var utter = new SpeechSynthesisUtterance(question.say);
      utter.lang = 'vi-VN';
      window.speechSynthesis.speak(utter);
    }
  }

  function questionKey(question) {
    return question ? (question.text + '|' + question.say + '|' + String(question.answer)) : '';
  }

  function nextDifferentQuestion(previousQuestion) {
    var previousKey = questionKey(previousQuestion);
    for (var i = 0; i < 8; i++) {
      currentQuestionIndex++;
      var q = getCurrentQuestion();
      if (!q) return q;
      if (questionKey(q) !== previousKey) return q;
    }
    return getCurrentQuestion();
  }

  // Show question modal
  function showQuestion() {
    if (netplayMode === 'guest') return;

    modalOpen = true;
    pauseGame();

    var question = getCurrentQuestion();
    if (!question) {
      currentLevel = 1;
      question = getCurrentQuestion();
    }

    var modal = document.getElementById('question-modal');
    modal.style.display = 'flex';

    wrongCount = 0;
    renderQuestion(question, '');

    if (isNetplayActive() && netplayOwner()) {
      netplayDeadline = Date.now() + 300000;
      var np = netplay();
      if (np) {
        np.sendMessage({ pause: true });
        np.sendMessage({ math: { type: 'question', question: question, level: currentLevel, deadline: netplayDeadline } });
      }
    }
  }

  function answerQuestion(value, question) {
    if (questionLocked) return;
    if (!question || question !== activeQuestion) return;

    if (netplayMode === 'guest') {
      if (netplayGuestAnswerLocked) return;
      netplayGuestAnswerLocked = true;
      var guestButtons = document.querySelectorAll('.question-choice');
      for (var gb = 0; gb < guestButtons.length; gb++) guestButtons[gb].disabled = true;
      var npGuest = netplay();
      if (npGuest) {
        npGuest.sendMessage({ math: { type: 'answer', questionKey: questionKey(question), value: value } });
      }
      return;
    }

    questionLocked = true;

    var choiceButtons = document.querySelectorAll('.question-choice');
    for (var i = 0; i < choiceButtons.length; i++) {
      choiceButtons[i].disabled = true;
    }

    var correct = (String(value) === String(question.answer));
    if (correct) {
      modalOpen = false;
      document.getElementById('question-modal').style.display = 'none';
      currentQuestionIndex++;
      currentLevel++;
      if (currentLevel > 31) currentLevel = 1;
      updateLevelDisplay();
      resumeGame();
      startQuestionTimer();
      if (audio && typeof audio.correct === 'function') audio.correct();

      if (isNetplayActive() && netplayOwner()) {
        var npCorrect = netplay();
        if (npCorrect) {
          npCorrect.sendMessage({ play: true });
          npCorrect.sendMessage({ math: { type: 'correct', level: currentLevel, timeLeft: 300 } });
        }
      }
    } else {
      wrongCount++;
      if (wrongCount >= 3) {
        currentLevel = Math.max(1, currentLevel - 1);
        loadQuestionsForLevel(currentLevel);
        wrongCount = 0;
        updateLevelDisplay();
        var newQuestion = (currentQuestions && currentQuestions.length)
          ? (currentQuestions[currentQuestionIndex] || getCurrentQuestion())
          : getCurrentQuestion();
        renderQuestion(newQuestion, 'Be dem lai tu dau nhe! 💪');

        if (isNetplayActive() && netplayOwner()) {
          var npWrong3 = netplay();
          if (npWrong3) {
            npWrong3.sendMessage({ math: { type: 'wrong', hint: 'Be dem lai tu dau nhe! 💪', question: newQuestion, level: currentLevel } });
          }
        }
      } else {
        var previousQuestion = activeQuestion;
        var newQuestion2 = nextDifferentQuestion(previousQuestion);
        if (!newQuestion2) {
          currentLevel = 1;
          newQuestion2 = getCurrentQuestion();
        }
        updateLevelDisplay();
        renderQuestion(newQuestion2, 'Thu lai nhe! Be lam duoc ma 💪');

        if (isNetplayActive() && netplayOwner()) {
          var npWrong = netplay();
          if (npWrong) {
            npWrong.sendMessage({ math: { type: 'wrong', hint: 'Thu lai nhe! Be lam duoc ma 💪', question: newQuestion2, level: currentLevel } });
          }
        }
      }
      if (audio && typeof audio.wrong === 'function') audio.wrong();
    }
  }

  function updateLevelDisplay() {
    var levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = 'Level ' + currentLevel;
  }

  // Pause/resume game. EmulatorJS stable exposes play(), not resume().
  function pauseGame() {
    gameRunning = false;
    var emu = window.EJS_emulator;
    if (!emu) return;
    try {
      if (typeof emu.pause === 'function') emu.pause();
    } catch (e) { /* ignore */ }

    if (netplayMode === 'host' && emu.isNetplay) {
      try { emu.netplay.sendMessage({ pause: true }); } catch (e) { /* ignore */ }
    }
  }

  function resumeGame() {
    gameRunning = true;
    var emu = window.EJS_emulator;
    if (!emu) return;
    try {
      if (typeof emu.play === 'function') { emu.play(); return; }
      if (typeof emu.togglePause === 'function' && emu.paused) { emu.togglePause(); return; }
      if (emu.gameManager && typeof emu.gameManager.toggleMainLoop === 'function') {
        emu.gameManager.toggleMainLoop(1);
      }
    } catch (e) { /* ignore */ }
  }

  // Virtual controls
  function setupVirtualControls() {
    var controls = document.getElementById('virtual-controls');
    if (!controls) return;
    var btns = controls.querySelectorAll('[data-key]');
    btns.forEach(function (btn) {
      var key = btn.getAttribute('data-key');
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pressButton(key, true);
      }, { passive: false });
      btn.addEventListener('touchend', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pressButton(key, false);
      }, { passive: false });
      btn.addEventListener('touchcancel', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pressButton(key, false);
      }, { passive: false });
      btn.addEventListener('touchmove', function (e) {
        e.preventDefault();
      }, { passive: false });
      btn.addEventListener('mousedown', function (e) {
        pressButton(key, true);
      });
      btn.addEventListener('mouseup', function () {
        pressButton(key, false);
      });
      btn.addEventListener('mouseleave', function () {
        pressButton(key, false);
      });
    });

    document.addEventListener('touchmove', function (e) {
      if (e.target && e.target.closest && e.target.closest('#virtual-controls')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  function pressButton(key, pressed) {
    var idx = {
      'ArrowUp': 4, 'ArrowDown': 5, 'ArrowLeft': 6, 'ArrowRight': 7,
      'x': 0, 'z': 1, 's': 2, 'a': 3,
      'q': 8, 'e': 9,
      'Shift': 10, 'Enter': 11
    }[key];
    if (idx === undefined) return;
    var gm = window.EJS_emulator && window.EJS_emulator.gameManager;
    if (gm && typeof gm.simulateInput === 'function') {
      try { gm.simulateInput(0, idx, pressed ? 1 : 0); } catch (e) { /* ignore */ }
    }
  }

  function sendKey(key, pressed) {
    pressButton(key, pressed);
  }

  function openEmulatorMenu() {
    var emu = window.EJS_emulator;
    if (!emu) return;
    try {
      if (emu.frontend && emu.frontend.menu && typeof emu.frontend.menu.open === 'function') {
        emu.frontend.menu.open(true);
        return;
      }
    } catch (e) { /* ignore */ }
    try {
      if (emu.elements && emu.elements.menuToggle) emu.elements.menuToggle.click();
    } catch (e) { /* ignore */ }
  }

  function toggleFastForward() {
    var emu = window.EJS_emulator;
    if (!emu || !emu.gameManager) return;
    try {
      fastForwardOn = !fastForwardOn;
      emu.isFastForward = fastForwardOn;
      if (typeof emu.gameManager.setFastForwardRatio === 'function') {
        emu.gameManager.setFastForwardRatio(fastForwardOn ? 3 : 0);
      }
      if (typeof emu.gameManager.toggleFastForward === 'function') {
        emu.gameManager.toggleFastForward(fastForwardOn ? 1 : 0);
      }
      var btn = document.getElementById('ff-toggle');
      if (btn) {
        btn.textContent = fastForwardOn ? '1x' : 'FF';
        btn.classList.toggle('active', fastForwardOn);
      }
    } catch (e) { /* ignore */ }
  }

  function disableEmulatorAutoMenu() {
    var emu = window.EJS_emulator;
    if (!emu) return;
    try {
      if (emu.elements && emu.elements.menuToggle) {
        emu.elements.menuToggle.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  var selectedRomFile = null;
  var selectedConsoleCore = null;

  function setupRomPicker() {
    var input = document.getElementById('rom-input');
    if (!input) return;
    input.addEventListener('change', function (e) {
      unlockAudio();
      var file = e.target.files[0];
      if (!file) return;
      selectedRomFile = file;
      selectedConsoleCore = detectConsole(file);
      if (!selectedConsoleCore) {
        showConsolePicker(file);
        setNetplayStatus('Khong nhan dien duoc console. Hay chon thu cong.');
      } else {
        setNetplayStatus('Da chon: ' + file.name);
      }
    }, false);
  }

  function getSelectedRom() {
    var input = document.getElementById('rom-input');
    if (selectedRomFile) return selectedRomFile;
    if (input && input.files && input.files[0]) {
      selectedRomFile = input.files[0];
      selectedConsoleCore = selectedConsoleCore || detectConsole(selectedRomFile);
      return selectedRomFile;
    }
    return null;
  }

  function getSelectedCore(file) {
    if (selectedConsoleCore) return selectedConsoleCore;
    var select = document.getElementById('console-select');
    if (select && select.value) return select.value;
    return detectConsole(file);
  }

  function showConsolePicker(file) {
    var picker = document.getElementById('console-picker');
    if (picker) picker.style.display = 'flex';
    var select = document.getElementById('console-select');
    if (select && select.options.length === 0) {
      var cores = ['nes', 'snes9x', 'gambatte', 'mgba', 'genesis_plus_gx', 'mupen64plus_next', 'pcsx_rearmed', 'desmume', 'mednafen_pce_fast', 'stella', 'prosystem', 'bluemsx', 'freeintv', 'virtualjaguar', 'handy', 'picodrive'];
      cores.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
      });
    }
  }

  function loadRom(file, core) {
    document.getElementById('rom-picker').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('game-screen').classList.add('active');
    initEmulator(file, core);
    setupVirtualControls();
    if (isMobile) {
      requestFullscreen();
      lockOrientation();
      document.body.classList.add('fullscreen');
      var topBar = document.getElementById('top-bar');
      if (topBar) topBar.style.display = 'none';
    }
  }

  function requestFullscreen() {
    var elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(function () {});
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    if (document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen();
  }

  function lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {});
    } else if (screen.lockOrientation) {
      screen.lockOrientation('landscape');
    } else if (screen.mozLockOrientation) {
      screen.mozLockOrientation('landscape');
    }
  }

  function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }

  // Keyboard support for desktop
  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!modalOpen || questionLocked) return;
      unlockAudio();
      if (/^[1-9]$/.test(e.key)) {
        var choices = document.querySelectorAll('.question-choice');
        var idx = parseInt(e.key, 10) - 1;
        if (choices[idx]) {
          choices[idx].click();
          e.preventDefault();
        }
      }
    }, false);
  }

  function setNetplayStatus(text) {
    if (netplayStatusEl) netplayStatusEl.textContent = text;
  }

  function setHostStatus(text) {
    if (netplayHostStatusEl) netplayHostStatusEl.textContent = 'Host: ' + text;
  }

  function testNetplayServer() {
    setNetplayStatus('Dang kiem tra server...');
    var url = netplayServerUrl + '/list?domain=' + encodeURIComponent(window.location.host) + '&game_id=' + encodeURIComponent(String(NETPLAY_AUTO_GAME_ID));
    fetch(url).then(function (res) {
      return res.text().then(function (text) {
        setNetplayStatus('Server phan hoi HTTP ' + res.status + ': ' + text.slice(0, 160));
      });
    }).catch(function (err) {
      setNetplayStatus('Server khong phan hoi: ' + err.message);
    });
  }

  function bindNetplayHandlers() {
    if (netplayHandlersBound) return;
    var np = netplay();
    if (!np || !np.socket) return;
    netplayHandlersBound = true;

    np.socket.on('data-message', function (d) {
      if (!d || !d.math) return;
      var m = d.math;

      if (m.type === 'question') {
        modalOpen = true;
        pauseGame();
        netplayGuestAnswerLocked = false;
        var modal = document.getElementById('question-modal');
        if (modal) modal.style.display = 'flex';
        wrongCount = 0;
        renderQuestion(m.question, '');
        netplayDeadline = m.deadline || (Date.now() + 300000);
        currentLevel = m.level || currentLevel;
        updateLevelDisplay();
        startNetplayGuestTimer();
      } else if (m.type === 'correct') {
        netplayGuestAnswerLocked = false;
        modalOpen = false;
        var modalCorrect = document.getElementById('question-modal');
        if (modalCorrect) modalCorrect.style.display = 'none';
        currentLevel = m.level || currentLevel;
        updateLevelDisplay();
        resumeGame();
        questionTimeLeft = m.timeLeft || 300;
        netplayDeadline = Date.now() + questionTimeLeft * 1000;
        updateTimerDisplay();
        startNetplayGuestTimer();
        if (audio && typeof audio.correct === 'function') audio.correct();
      } else if (m.type === 'wrong') {
        netplayGuestAnswerLocked = false;
        currentLevel = m.level || currentLevel;
        updateLevelDisplay();
        renderQuestion(m.question, m.hint || 'Thu lai nhe!');
      } else if (m.type === 'answer' && netplayOwner()) {
        var npHost = netplay();
        if (npHost && activeQuestion && questionKey(activeQuestion) === m.questionKey) {
          answerQuestion(m.value, activeQuestion);
        }
      }
    });
  }

  function startNetplayAfterLoad() {
    var np = netplay();
    if (!np) return;
    np.name = (netplayMode === 'host') ? 'Host' : 'Guest';
    var sid = netplayRoomCode;
    var pid = 'P-' + Math.random().toString(36).substring(2) + Date.now();
    np.playerID = pid;
    np.players = {};
    np.maxPlayers = 2;
    np.extra = {
      domain: window.location.host,
      game_id: netplayGameId,
      room_name: netplayRoomCode,
      player_name: np.name,
      userid: pid,
      sessionid: sid
    };
    np.players[pid] = np.extra;

    var finishBind = function () {
      setTimeout(bindNetplayHandlers, 1000);
      setTimeout(function () {
        if (netplayStatusEl) {
          netplayStatusEl.textContent = (netplayMode === 'host')
            ? 'Da tao phong tu dong. Dang cho nguoi choi thu 2...'
            : 'Da vao phong tu dong.';
        }
      }, 1500);
    };

    var start = function () {
      if (netplayMode === 'host') {
        np.socket.emit('open-room', { extra: np.extra, maxPlayers: 2, password: '' }, function (err) {
          if (err) {
            np.owner = false;
            np.socket.emit('join-room', { extra: np.extra, password: '' }, function (err2, users) {
              if (err2) {
                if (netplayStatusEl) netplayStatusEl.textContent = 'Netplay loi: ' + err2;
                return;
              }
              np.players = users || np.players;
              np.roomJoined(false, netplayRoomCode, '', sid);
              setHostStatus('da ket noi voi host');
              finishBind();
            });
          } else {
            np.owner = true;
            np.roomJoined(true, netplayRoomCode, '', sid);
            setHostStatus('dang online - dang cho nguoi choi 2');
            finishBind();
          }
        });
      } else {
        var tryJoin = function () {
          np.socket.emit('join-room', { extra: np.extra, password: '' }, function (err, users) {
            if (err) {
              if (netplayStatusEl) netplayStatusEl.textContent = 'Dang cho host... ' + (err || '');
              setHostStatus('chua co host, dang cho...');
              setTimeout(tryJoin, 2000);
              return;
            }
            np.owner = false;
            np.players = users || np.players;
            np.roomJoined(false, netplayRoomCode, '', sid);
            setHostStatus('da ket noi voi host');
            finishBind();
          });
        };
        tryJoin();
      }
    };

    if (np.socket && np.socket.connected) start();
    else np.startSocketIO(start);
  }

  function uploadRomToRelay(file, cb) {
    if (!netplayRelayUrl) { cb(); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      var base64 = String(e.target.result).split(',')[1] || '';
      fetch(netplayRelayUrl + '/api/rom/' + encodeURIComponent(netplayRoomCode), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Room-Password': netplayPassword },
        body: JSON.stringify({ romBase64: base64, fileName: file.name, core: detectConsole(file), gameId: netplayGameId })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function () { cb(); }).catch(function (err) {
        setNetplayStatus('Khong upload duoc ROM: ' + err.message);
        cb();
      });
    };
    reader.onerror = function () { cb(); };
    reader.readAsDataURL(file);
  }

  function downloadRomFromRelay(cb) {
    if (!netplayRelayUrl) { cb(null); return; }
    fetch(netplayRelayUrl + '/api/rom/' + encodeURIComponent(netplayRoomCode) + '?password=' + encodeURIComponent(netplayPassword))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var binary = atob(data.romBase64 || '');
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var file = new File([bytes], data.fileName || 'rom.bin', { type: 'application/octet-stream' });
        cb(file, data.core || detectConsole(file), data.gameId || netplayGameId);
      })
      .catch(function (err) {
        setNetplayStatus('Khong tai duoc ROM: ' + err.message);
        cb(null);
      });
  }

  var NETPLAY_AUTO_GAME_ID = 999999;

  function findOpenNetplayRoom(cb) {
    var url = netplayServerUrl + '/list?domain=' + encodeURIComponent(window.location.host) + '&game_id=' + encodeURIComponent(String(NETPLAY_AUTO_GAME_ID));
    fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var keys = Object.keys(data || {});
      var openKey = null;
      keys.forEach(function (k) {
        if (!openKey && data[k] && Number(data[k].current || 0) < Number(data[k].max || 2)) {
          openKey = k;
        }
      });
      cb(openKey);
    }).catch(function () {
      cb(null);
    });
  }

  function waitForHostRoom(cb, attempts) {
    attempts = attempts || 0;
    if (attempts > 60) {
      setNetplayStatus('Khong tim thay host. Hay thu lai.');
      return;
    }
    findOpenNetplayRoom(function (code) {
      if (code) cb(code);
      else {
        setNetplayStatus('Dang tim host tu dong... (' + (attempts + 1) + ')');
        setTimeout(function () { waitForHostRoom(cb, attempts + 1); }, 2000);
      }
    });
  }

  function createHostRoomAuto(file, core) {
    netplayRoomCode = 'KM-AUTO';
    netplayPassword = '';
    netplayMode = 'host';
    netplayGameId = NETPLAY_AUTO_GAME_ID;
    uploadRomToRelay(file, function () {
      loadRom(file, core);
    });
  }

  function joinGuestRoomAuto(roomCode, file, core) {
    netplayRoomCode = 'KM-AUTO';
    netplayPassword = '';
    netplayMode = 'guest';
    netplayGameId = NETPLAY_AUTO_GAME_ID;
    if (netplayRelayUrl) {
      downloadRomFromRelay(function (downloadedFile, downloadedCore, gameId) {
        if (!downloadedFile) return;
        if (gameId) netplayGameId = gameId;
        var finalCore = downloadedCore || core || detectConsole(downloadedFile);
        if (!finalCore) {
          setNetplayStatus('Khong nhan dien duoc console cua ROM host.');
          return;
        }
        loadRom(downloadedFile, finalCore);
      });
    } else {
      if (!file) {
        setNetplayStatus('Host da tao phong. Hay chon cung file ROM roi bam lai.');
        return;
      }
      if (!core) core = detectConsole(file);
      var select = document.getElementById('console-select');
      if (!core && select) core = select.value;
      if (!core) {
        setNetplayStatus('Khong nhan dien duoc console.');
        return;
      }
      loadRom(file, core);
    }
  }

  function playSingle() {
    var file = getSelectedRom();
    if (!file) {
      setNetplayStatus('Chon file ROM truoc.');
      return;
    }
    var core = getSelectedCore(file);
    var select = document.getElementById('console-select');
    if (!core && select) core = select.value;
    if (!core) {
      setNetplayStatus('Khong nhan dien duoc console.');
      return;
    }
    netplayMode = 'single';
    hashRomFile(file, function (id) { netplayGameId = id; loadRom(file, core); });
  }

  function autoConnectOnline() {
    var file = getSelectedRom();
    var core = file ? getSelectedCore(file) : null;
    var select = document.getElementById('console-select');
    if (!core && select) core = select.value;

    if (file) {
      if (!core) core = detectConsole(file);
      if (!core && select) core = select.value;
      if (!core) {
        setNetplayStatus('Khong nhan dien duoc console.');
        return;
      }
      setNetplayStatus('Dang tim phong tu dong...');
      findOpenNetplayRoom(function (roomCode) {
        if (roomCode) {
          joinGuestRoomAuto(roomCode, file, core);
        } else {
          createHostRoomAuto(file, core);
        }
      });
    } else {
      netplayMode = 'guest';
      netplayGameId = NETPLAY_AUTO_GAME_ID;
      setNetplayStatus('Dang tim host tu dong...');
      setHostStatus('dang tim host...');
      waitForHostRoom(function (roomCode) {
        joinGuestRoomAuto(roomCode, null, null);
      });
    }
  }

  // Init
  function init() {
    var app = document.getElementById('app');
    app.innerHTML = '';

    if (KM.Audio && typeof KM.Audio.create === 'function') {
      audio = KM.Audio.create({ enabled: settings.sfx });
    }

    var romPicker = el('div', { id: 'rom-picker', class: 'screen rom-picker active' }, [
      el('h1', { text: 'Kid Math Retro' }),
      el('p', { text: 'Chon file ROM de bat dau choi' }),
      el('input', { type: 'file', id: 'rom-input', accept: '.nes,.snes,.smc,.sfc,.gb,.gbc,.gba,.md,.gen,.bin,.n64,.z64,.v64,.nds,.cue,.iso,.chd,.pce,.a26,.a78,.col,.msx,.int,.jag,.lnx' }),
      el('label', { for: 'rom-input', class: 'btn btn-primary', text: 'Chon file ROM' }),
      el('div', { id: 'console-picker', class: 'console-picker', style: { display: 'none' } }, [
        el('p', { text: 'Khong nhan dang duoc console. Chon thu cong:' }),
        el('select', { id: 'console-select' }),
        el('button', { class: 'btn btn-primary', text: 'OK', on: { click: function () {
          selectedConsoleCore = document.getElementById('console-select').value;
          var file = document.getElementById('rom-input').files[0];
          if (file) {
            selectedRomFile = file;
            setNetplayStatus('Da chon: ' + file.name);
          }
        } } })
      ]),
      el('div', { class: 'netplay-panel' }, [
        el('h2', { text: 'Choi online 2 nguoi (tu dong)' }),
        el('p', { text: 'Khong can ma phong/mat khau. Host chon ROM roi bam nut; may kia bam cung nut de tu dong ket noi. Neu co relay, host se gui ROM.' }),
        el('div', { class: 'netplay-row' }, [
          el('button', { class: 'btn btn-primary', text: 'Choi don', on: { click: playSingle } }),
          el('button', { class: 'btn btn-primary', text: 'Choi online tu dong', on: { click: autoConnectOnline } }),
          el('button', { class: 'btn btn-ghost', text: 'Kiem tra server', on: { click: testNetplayServer } })
        ]),
        el('p', { id: 'netplay-status', class: 'netplay-status', text: '' }),
        el('p', { id: 'netplay-host-status', class: 'netplay-status', text: 'Host: chua ket noi' }),
        el('p', { class: 'netplay-status', text: 'Server: ' + netplayServerUrl })
      ])
    ]);
    netplayStatusEl = romPicker.querySelector('#netplay-status');
    netplayHostStatusEl = romPicker.querySelector('#netplay-host-status');
    app.appendChild(romPicker);

    var gameScreen = el('div', { id: 'game-screen', class: 'screen game-screen', style: { display: 'none' } }, [
      el('div', { id: 'top-bar', class: 'top-bar' }, [
        el('div', { class: 'top-bar-actions' }, [
          el('button', { class: 'icon-btn', text: '☰', title: 'Mo menu', on: { click: function () { openEmulatorMenu(); } } }),
          el('button', { id: 'ff-toggle', class: 'icon-btn', text: 'FF', title: 'Tua nhanh', on: { click: function () { toggleFastForward(); } } })
        ]),
        el('span', { id: 'timer', class: 'timer', text: '5:00' }),
        el('span', { id: 'level', class: 'level', text: 'Level 1' })
      ]),
      el('div', { id: 'emulator-container', class: 'emulator-container' }),
      el('div', { id: 'virtual-controls', class: 'virtual-controls' }, [
        el('div', { class: 'dpad-circle' }, [
          el('button', { class: 'vbtn vbtn-dpad vbtn-up', 'data-key': 'ArrowUp', text: '↑' }),
          el('button', { class: 'vbtn vbtn-dpad vbtn-left', 'data-key': 'ArrowLeft', text: '←' }),
          el('button', { class: 'vbtn vbtn-dpad vbtn-down', 'data-key': 'ArrowDown', text: '↓' }),
          el('button', { class: 'vbtn vbtn-dpad vbtn-right', 'data-key': 'ArrowRight', text: '→' })
        ]),
        el('div', { class: 'center-column' }, [
          el('div', { class: 'system-row' }, [
            el('button', { class: 'vbtn vbtn-system vbtn-select', 'data-key': 'Shift', text: 'Select' }),
            el('button', { class: 'vbtn vbtn-system vbtn-start', 'data-key': 'Enter', text: 'Start' })
          ]),
        ]),
        el('div', { class: 'right-column' }, [
          el('div', { class: 'shoulder-row' }, [
            el('button', { class: 'vbtn vbtn-shoulder', 'data-key': 'q', text: 'L' }),
            el('button', { class: 'vbtn vbtn-shoulder', 'data-key': 'e', text: 'R' })
          ]),
          el('div', { class: 'action-circle' }, [
            el('button', { class: 'vbtn vbtn-action vbtn-x', 'data-key': 's', text: 'X' }),
            el('button', { class: 'vbtn vbtn-action vbtn-y', 'data-key': 'a', text: 'Y' }),
            el('button', { class: 'vbtn vbtn-action vbtn-a', 'data-key': 'x', text: 'A' }),
            el('button', { class: 'vbtn vbtn-action vbtn-b', 'data-key': 'z', text: 'B' })
          ])
        ])
      ])
    ]);
    app.appendChild(gameScreen);

    var questionModal = el('div', { id: 'question-modal', class: 'question-modal', style: { display: 'none' } }, [
      el('div', { class: 'modal-card' }, [
        el('p', { id: 'question-text', class: 'question-text' }),
        el('div', { id: 'question-visual', class: 'question-visual' }),
        el('div', { id: 'question-choices', class: 'question-choices' }),
        el('p', { id: 'question-hint', class: 'question-hint', style: { display: 'none' } }),
        el('button', { class: 'btn btn-ghost', text: '🔊 Nghe lai', on: { click: function () {
          if (activeQuestion && settings.speech && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            var utter = new SpeechSynthesisUtterance(activeQuestion.say);
            utter.lang = 'vi-VN';
            window.speechSynthesis.speak(utter);
          }
        } } })
      ])
    ]);
    app.appendChild(questionModal);

    setupRomPicker();
    setupKeyboard();
  }

  return { init: init, showQuestion: showQuestion };
})();

document.addEventListener('DOMContentLoaded', function () {
  KM.App.init();
});
