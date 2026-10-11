/* Квант-Стиль: логика лендинга. Без зависимостей. */
(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- аналитика (GTM / GA4) ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var data = { event: event };
    for (var k in params || {}) data[k] = params[k];
    window.dataLayer.push(data);
  }
  if (cfg.gtmId) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var gtm = document.createElement('script');
    gtm.async = true;
    gtm.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtmId);
    document.head.appendChild(gtm);
  }

  /* ---------- всплывающее сообщение ---------- */
  var toastEl = $('[data-toast]');
  var toastTimer;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 4000);
  }

  /* ---------- контакты и мессенджеры ---------- */
  var contactText = {
    'phone-main-text': cfg.phoneMainText,
    'phone2-text': cfg.phone2Text,
    'telegram-text': cfg.telegram && '@' + cfg.telegram,
    'instagram-text': cfg.instagram,
    'email-text': cfg.email
  };
  $$('[data-contact]').forEach(function (el) {
    var v = contactText[el.getAttribute('data-contact')];
    if (v) el.textContent = v;
  });

  function messengerHref(kind, msg) {
    switch (kind) {
      case 'whatsapp': return 'https://wa.me/' + cfg.whatsappPhone + '?text=' + encodeURIComponent(msg);
      case 'telegram': return 'https://t.me/' + cfg.telegram;
      case 'viber': return 'viber://chat?number=' + encodeURIComponent(cfg.viberPhone);
      case 'instagram': return 'https://ig.me/m/' + cfg.instagram;
      case 'instagram-profile': return 'https://www.instagram.com/' + cfg.instagram + '/';
      case 'phone': return 'tel:' + cfg.phoneMain;
      case 'phone2': return 'tel:' + cfg.phone2;
      case 'email': return 'mailto:' + cfg.email;
    }
    return '#';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* не страшно */ }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  $$('[data-messenger]').forEach(function (a) {
    var kind = a.getAttribute('data-messenger');
    var msg = a.getAttribute('data-msg') || cfg.defaultMessage || '';
    a.href = messengerHref(kind, msg);
    if (/^https:/.test(a.href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    a.addEventListener('click', function () {
      var ev = { phone2: 'phone', 'instagram-profile': 'instagram' }[kind] || kind;
      track('click_' + ev, { link_location: locationOf(a) });
      // Telegram и Viber не умеют подставлять текст в чат: кладём его в буфер обмена
      if ((kind === 'telegram' || kind === 'viber') && msg) {
        copyText(msg).then(function () {
          toast('Текст сообщения скопирован: вставьте его в чат');
        }, function () {});
      }
    });
  });

  function locationOf(el) {
    var s = el.closest('section, header, footer, [data-fab]');
    return s ? (s.id || s.tagName.toLowerCase()) : 'page';
  }

  /* ---------- шапка ---------- */
  var header = $('[data-header]');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- плавающая кнопка «Написать» ---------- */
  var fab = $('[data-fab]');
  if (fab) {
    var fabToggle = $('.fab__toggle', fab);
    var fabMenu = $('.fab__menu', fab);
    var setFab = function (open) {
      fab.classList.toggle('is-open', open);
      fabMenu.hidden = !open;
      fabToggle.setAttribute('aria-expanded', String(open));
    };
    fabToggle.addEventListener('click', function () { setFab(fabMenu.hidden); });
    document.addEventListener('click', function (e) { if (!fab.contains(e.target)) setFab(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setFab(false); });

    var hero = $('.hero');
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(function (entries) {
        var visible = !entries[0].isIntersecting;
        fab.classList.toggle('is-visible', visible);
        if (!visible) setFab(false);
      }, { threshold: 0.15 }).observe(hero);
    } else {
      fab.classList.add('is-visible');
    }
  }

  /* ---------- как будет выглядеть душевая: помещение, затем стекло и фурнитура ---------- */
  // Подписи вариантов 🟡 подтвердить у клиента (CLAUDE.md, раздел 0.1). Последний чип: то же место до установки.
  var ROOMS = [
    { before: 'onyx-before', items: [
      ['onyx-clear-gold', 'Прозрачное · золото'],
      ['onyx-bronze-gold', 'Бронза · золото'],
      ['onyx-bronze-matte-gold', 'Матовая бронза · золото']
    ] },
    { before: 'sauna-before', items: [
      ['sauna-bronze', 'Бронза · хром'],
      ['sauna-bronze-matte', 'Матовая бронза · хром']
    ] },
    { before: 'podium-before', items: [
      ['podium-chrome', 'Прозрачное · хром'],
      ['podium-black', 'Прозрачное · чёрный матовый']
    ] },
    { before: 'wood-before', items: [
      ['wood-graphite', 'Графит · хром'],
      ['wood-bronze', 'Бронза · хром']
    ] },
    { before: 'concrete-before', items: [
      ['concrete-black', 'Прозрачное · чёрный матовый']
    ] }
  ];
  var VIZ = 'img/viz/';

  var viewer = $('[data-viewer]');
  if (viewer) {
    var roomsBox = $('[data-viewer-rooms]', viewer);
    var stage = $('[data-viewer-stage]', viewer);
    var optBox = $('[data-viewer-options]', viewer);
    var roomCountEl = $('[data-viewer-count]', viewer);
    var currentRoom = 0;

    var press = function (list, idx) {
      list.forEach(function (el, j) {
        el.classList.toggle('is-active', j === idx);
        el.setAttribute('aria-pressed', String(j === idx));
      });
    };

    var showRoom = function (ri) {
      var room = ROOMS[ri];
      var items = room.items.concat([[room.before, 'До установки']]);
      currentRoom = ri;
      if (roomCountEl) roomCountEl.textContent = (ri + 1) + ' / ' + ROOMS.length;
      press($$('.room', roomsBox), ri);
      $$('img', stage).forEach(function (img) { img.remove(); });
      stage.classList.remove('is-before');
      optBox.innerHTML = '';

      items.forEach(function (it, i) {
        var isBefore = i === room.items.length;
        var img = new Image();
        img.src = VIZ + it[0] + '.webp';
        img.alt = isBefore ? 'Помещение до установки душевой'
          : '3D-визуализация душевой: стекло ' + it[1].replace(' · ', ', фурнитура ').toLowerCase();
        img.decoding = 'async';
        if (i === 0) img.className = 'is-active';
        stage.appendChild(img);

        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (isBefore ? ' chip--muted' : '');
        chip.textContent = it[1];
        chip.addEventListener('click', function () {
          $$('img', stage).forEach(function (im, j) { im.classList.toggle('is-active', j === i); });
          press($$('.chip', optBox), i);
          stage.classList.toggle('is-before', isBefore);
          track('variant_select', { room: ri + 1, variant: it[1] });
        });
        optBox.appendChild(chip);
      });
      press($$('.chip', optBox), 0);
    };

    ROOMS.forEach(function (room, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'room';
      b.setAttribute('aria-label', 'Помещение ' + (i + 1));
      b.innerHTML = '<img src="' + VIZ + 'thumb/' + room.items[0][0] + '.webp" alt="" decoding="async">';
      b.addEventListener('click', function () {
        showRoom(i);
        track('room_select', { room: i + 1 });
      });
      roomsBox.appendChild(b);
    });

    // стрелки и свайп по фото: листают помещения (главное управление на телефоне)
    var stepRoom = function (dir) {
      var next = (currentRoom + dir + ROOMS.length) % ROOMS.length;
      showRoom(next);
      track('room_select', { room: next + 1, via: 'arrows' });
    };
    $('[data-viewer-prev]', viewer).addEventListener('click', function () { stepRoom(-1); });
    $('[data-viewer-next]', viewer).addEventListener('click', function () { stepRoom(1); });

    var sx = null, sy = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || e.target.closest('button')) return;
      sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) stepRoom(dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', function () { sx = null; });

    // большие картинки грузим, когда блок рядом с экраном
    var started = false;
    var start = function () { if (!started) { started = true; showRoom(0); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, obs) {
        if (en[0].isIntersecting) { start(); obs.disconnect(); }
      }, { rootMargin: '400px' }).observe(viewer);
    } else {
      start();
    }
  }

  /* ---------- квиз ---------- */
  var TYPES = [
    { id: 'niche', label: 'В нишу', icon: 't-niche' },
    { id: 'corner', label: 'Угловая', icon: 't-corner' },
    { id: 'u', label: 'П-образная', icon: 't-u' },
    { id: 'walkin', label: 'Walk-in, перегородка', icon: 't-walkin' },
    { id: 'custom', label: 'Нестандартная', icon: 't-custom' },
    { id: 'unknown', label: 'Не знаю, нужна консультация', icon: 't-unknown' }
  ];
  var DOORS = ['Распашная', 'Раздвижная', 'Без двери', 'Не знаю'];
  var GLASS = [
    ['Прозрачное', 'с зелёным оттенком'],
    ['Матовое', 'с зелёным оттенком'],
    ['Осветлённое «Crystalvision» прозрачное', 'без оттенков'],
    ['Матовое «Crystalvision»', 'белое'],
    ['Тонированное «Бронза»', 'есть и матовое'],
    ['Тонированное «Графит»', 'есть и матовое'],
    ['Рельефное «Мору» прозрачное', ''],
    ['Рельефное «Мору» матовое', ''],
    ['Не знаю, нужна консультация', '']
  ];
  var HARDWARE = [
    ['Полированный хром', 'полированная нержавейка'],
    ['Сатин', 'шлифованная нержавейка'],
    ['Чёрный матовый', ''],
    ['Оружейная сталь', ''],
    ['Глянцевое золото', ''],
    ['Белый', ''],
    ['Бронза', ''],
    ['Не знаю, нужна консультация', '']
  ];
  var TIMING = ['Как можно скорее', 'В течение месяца', 'Идёт ремонт, планирую', 'Просто узнаю цену'];
  var CHANNELS = ['Telegram', 'Viber', 'WhatsApp', 'Звонок'];
  var TOTAL = 6;

  // Размеры, см: разумные пределы для стеклянной душевой
  var SIZES = {
    width: { label: 'Ширина', min: 30, max: 400 },
    depth: { label: 'Глубина', min: 30, max: 400 },
    height: { label: 'Высота', min: 100, max: 350 }
  };
  var SIZE_NAMES = { width: 'ширину', depth: 'глубину', height: 'высоту' };
  // ['а', 'б', 'в'] -> 'а, б и в'
  function joinRu(list) {
    return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' и ' + list[list.length - 1];
  }

  var dialog = $('#quiz-dialog');
  var form = $('[data-quiz-form]');
  var backBtn = $('[data-quiz-back]');
  var countEl = $('[data-quiz-count]');
  var barEl = $('[data-quiz-bar]');
  var step = 0;
  var state;
  var advanceTimer;
  var sending = false;
  var autoDoor = false; // дверь подставлена сама (walk-in), а не выбрана человеком

  function resetState() {
    state = { type: '', door: '', width: '', depth: '', height: '', noSizes: false,
              glass: '', hardware: '', timing: '', name: '', contact: '', channel: '', consent: false };
    step = 0;
    autoDoor = false;
  }
  resetState();

  // Глубина нужна там, где больше одной стеклянной стороны. Ширина и высота нужны всегда
  function neededSizes() {
    return state.type === 'corner' || state.type === 'u' || state.type === 'custom'
      ? ['width', 'depth', 'height'] : ['width', 'height'];
  }

  /* --- телефон и ник --- */
  // Коды Беларуси: мобильные 25, 29, 33, 44 и городские 15–17, 21–23
  var BY_PHONE = /^375(25|29|33|44|1[5-7]|2[1-3])\d{7}$/;
  // Возвращает номер в международном виде (+375291234567) или null
  function parsePhone(v) {
    var raw = String(v || '').trim();
    if (!/^[\d\s()+\-]+$/.test(raw)) return null;
    var d = raw.replace(/\D/g, '');
    if (/^80\d{9}$/.test(d)) d = '375' + d.slice(2);        // 8 029 123-45-67
    else if (/^\d{9}$/.test(d)) d = '375' + d;              // 29 123-45-67
    if (/^375/.test(d)) return BY_PHONE.test(d) ? '+' + d : null;
    if (/^\+/.test(raw) && d.length >= 10 && d.length <= 15) return '+' + d; // другие страны
    return null;
  }
  function formatPhone(p) {
    var m = /^\+375(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(p);
    return m ? '+375 (' + m[1] + ') ' + m[2] + '-' + m[3] + '-' + m[4] : p;
  }
  function parseNick(v) {
    var m = /^@?([A-Za-z][A-Za-z0-9_]{4,31})$/.exec(String(v || '').trim());
    return m ? '@' + m[1] : null;
  }
  var NAME_RE = /^[A-Za-zА-Яа-яЁёІіЎў][A-Za-zА-Яа-яЁёІіЎў' -]{1,39}$/;

  /* --- разметка шагов --- */
  function errorBox(name) {
    return '<p class="q-error" data-error="' + name + '" role="alert" hidden></p>';
  }

  function optionList(list, key) {
    return '<div class="q-options">' + list.map(function (o) {
      var label = o[0], note = o[1];
      var sel = state[key] === label;
      return '<button type="button" class="q-option' + (sel ? ' is-selected' : '') + '" data-pick="' + key + '" data-value="' + esc(label) + '">' +
        '<span>' + esc(label) + (note ? '<small>' + esc(note) + '</small>' : '') + '</span><span class="q-option__mark"></span></button>';
    }).join('') + '</div>' + errorBox(key);
  }

  function chips(list, key) {
    return '<div class="q-chips">' + list.map(function (c) {
      var on = state[key] === c;
      return '<button type="button" class="chip' + (on ? ' is-active' : '') + '" data-pick="' + key + '" data-value="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>';
    }).join('') + '</div>' + errorBox(key);
  }

  function nextButton(text) {
    return '<div class="quiz__footer"><button class="btn btn--cta btn--lg" type="submit">' +
      text + '<svg class="icon"><use href="#i-arrow-right"/></svg></button></div>';
  }

  function sizeField(key) {
    var s = SIZES[key];
    var optional = neededSizes().indexOf(key) === -1;
    return '<div class="q-field"><label for="q-' + key + '">' + s.label + (optional ? '' : ' *') + '</label>' +
      '<input id="q-' + key + '" type="text" inputmode="numeric" maxlength="3" autocomplete="off" data-bind="' + key + '"' +
      ' value="' + esc(state[key]) + '" placeholder="' + (optional ? 'необяз.' : 'см') + '"' + (state.noSizes ? ' disabled' : '') + '></div>';
  }

  function contactLabel() {
    return state.channel === 'Telegram' ? 'Телефон или ник в Telegram' : 'Номер телефона';
  }
  function contactPlaceholder() {
    return state.channel === 'Telegram' ? '+375 29 123-45-67 или @ник' : '+375 (29) 123-45-67';
  }

  function renderStep() {
    var html = '';
    if (step === 0) {
      html = '<h2 class="quiz__title" id="quiz-title">Какая душевая нужна?</h2>' +
        '<p class="quiz__sub">Выберите похожий вариант, детали уточним в переписке</p>' +
        '<div class="q-options q-options--grid">' + TYPES.map(function (t) {
          return '<button type="button" class="q-option q-option--tile' + (state.type === t.id ? ' is-selected' : '') + '" data-pick="type" data-value="' + t.id + '">' +
            '<svg aria-hidden="true"><use href="#' + t.icon + '"/></svg><span>' + t.label + '</span></button>';
        }).join('') + '</div>' + errorBox('type') +
        '<p class="quiz__group-title">Дверь *</p>' + chips(DOORS, 'door') +
        nextButton('Далее');
    } else if (step === 1) {
      html = '<h2 class="quiz__title" id="quiz-title">Примерные размеры</h2>' +
        '<p class="quiz__sub">В сантиметрах, можно округлить. Точно замерим сами</p>' +
        '<div class="q-fields q-fields--3">' + sizeField('width') + sizeField('depth') + sizeField('height') + '</div>' +
        errorBox('sizes') +
        '<label class="q-check"><input type="checkbox" data-bind="noSizes"' + (state.noSizes ? ' checked' : '') + '>' +
        '<span>Не знаю размеры, подскажите, как замерить</span></label>' +
        nextButton('Далее');
    } else if (step === 2) {
      html = '<h2 class="quiz__title" id="quiz-title">Какое стекло нравится?</h2>' +
        '<p class="quiz__sub">Если сомневаетесь, покажем варианты на 3D-проекте</p>' + optionList(GLASS, 'glass') + nextButton('Далее');
    } else if (step === 3) {
      html = '<h2 class="quiz__title" id="quiz-title">Цвет фурнитуры</h2>' +
        '<p class="quiz__sub">Петли, ручки, профили и крепления</p>' + optionList(HARDWARE, 'hardware') + nextButton('Далее');
    } else if (step === 4) {
      html = '<h2 class="quiz__title" id="quiz-title">Когда нужна душевая?</h2>' +
        '<p class="quiz__sub">Изготовление с установкой обычно около двух недель</p>' +
        optionList(TIMING.map(function (t) { return [t, '']; }), 'timing') + nextButton('Далее');
    } else if (step === 5) {
      html = '<h2 class="quiz__title" id="quiz-title">Куда прислать расчёт?</h2>' +
        '<p class="quiz__sub">Рассчитаем стоимость и напишем вам. Замер и 3D-проект бесплатно</p>' +
        '<p class="quiz__group-title quiz__group-title--first">Как удобнее связаться? *</p>' + chips(CHANNELS, 'channel') +
        '<div class="q-fields q-fields--contact">' +
        '<div class="q-field"><label for="q-name">Как к вам обращаться *</label>' +
        '<input id="q-name" type="text" maxlength="40" autocomplete="given-name" data-bind="name" value="' + esc(state.name) + '" placeholder="Имя">' +
        errorBox('name') + '</div>' +
        '<div class="q-field"><label for="q-contact" data-contact-label>' + contactLabel() + ' *</label>' +
        '<input id="q-contact" type="text" maxlength="40" autocomplete="tel" inputmode="' + (state.channel === 'Telegram' ? 'text' : 'tel') + '"' +
        ' data-bind="contact" value="' + esc(state.contact) + '" placeholder="' + contactPlaceholder() + '">' +
        errorBox('contact') + '</div>' +
        '</div>' +
        '<label class="q-check q-check--consent"><input type="checkbox" data-bind="consent"' + (state.consent ? ' checked' : '') + '>' +
        '<span>Даю согласие на обработку персональных данных в соответствии с <a href="privacy.html" target="_blank" rel="noopener">политикой</a> *</span></label>' +
        errorBox('consent') +
        '<input class="q-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        nextButton('Получить расчёт');
    } else {
      var how = state.channel === 'Звонок' ? 'Рассчитаем стоимость и перезвоним вам.' : 'Рассчитаем стоимость и ответим в ' + esc(state.channel) + '.';
      html = '<div class="quiz__done"><div class="quiz__done-icon"><svg class="icon"><use href="#i-check"/></svg></div>' +
        '<h2 id="quiz-title">Спасибо, заявка принята!</h2>' +
        '<p>' + how + ' Бесплатный замер и 3D-проект до договора.</p>' +
        '<button class="btn btn--cta" type="button" data-quiz-close>Вернуться на сайт</button>' +
        (cfg.leadEndpoint ? '' : '<p class="quiz__demo-note">Демо-режим: отправка заявок подключается перед запуском сайта.</p>') +
        '</div>';
    }

    form.innerHTML = '<div class="quiz__step">' + html + '</div>';
    // фокус на заголовок шага: понятно экранным читалкам, без рамки на кнопках
    var t = $('#quiz-title', form);
    if (t && dialog.open) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    var done = step >= TOTAL;
    backBtn.hidden = step === 0 || done;
    countEl.textContent = done ? 'Готово' : 'Шаг ' + (step + 1) + ' из ' + TOTAL;
    barEl.style.width = (done ? 100 : (step / TOTAL) * 100) + '%';
    form.scrollTop = 0;
  }

  /* --- проверка шагов --- */
  function setError(name, msg) {
    var el = $('[data-error="' + name + '"]', form);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function markInvalid(input, bad) {
    if (input) {
      input.classList.toggle('is-invalid', !!bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }
  }

  // Возвращает список ошибок шага: [{ name, msg, focus }]
  function stepErrors(n) {
    var errs = [];
    if (n === 0) {
      if (!state.type) errs.push({ name: 'type', msg: 'Выберите тип душевой' });
      if (!state.door) errs.push({ name: 'door', msg: 'Выберите тип двери или «Не знаю»' });
    } else if (n === 1) {
      if (state.noSizes) return errs;
      var need = neededSizes(), missing = [], bad = [];
      ['width', 'depth', 'height'].forEach(function (k) {
        var v = state[k], s = SIZES[k];
        if (!v) { if (need.indexOf(k) !== -1) missing.push(k); return; }
        var num = parseInt(v, 10);
        if (!(num >= s.min && num <= s.max)) bad.push(k);
      });
      if (missing.length || bad.length) {
        var msgs = bad.map(function (k) { return SIZES[k].label + ': от ' + SIZES[k].min + ' до ' + SIZES[k].max + ' см.'; });
        if (missing.length) msgs.unshift('Укажите ' + joinRu(missing.map(function (k) { return SIZE_NAMES[k]; })) + ' или отметьте «Не знаю размеры».');
        errs.push({ name: 'sizes', fields: missing.concat(bad), msg: msgs.join(' ') });
      }
    } else if (n === 2) {
      if (!state.glass) errs.push({ name: 'glass', msg: 'Выберите стекло или «Не знаю»' });
    } else if (n === 3) {
      if (!state.hardware) errs.push({ name: 'hardware', msg: 'Выберите цвет фурнитуры или «Не знаю»' });
    } else if (n === 4) {
      if (!state.timing) errs.push({ name: 'timing', msg: 'Выберите вариант' });
    } else if (n === 5) {
      if (!state.channel) errs.push({ name: 'channel', msg: 'Выберите способ связи' });
      var name = state.name.trim();
      if (!name) errs.push({ name: 'name', field: 'q-name', msg: 'Напишите, как к вам обращаться' });
      else if (!NAME_RE.test(name)) errs.push({ name: 'name', field: 'q-name', msg: 'Имя: только буквы, от 2 символов' });
      var c = state.contact.trim();
      var tg = state.channel === 'Telegram';
      if (!c) errs.push({ name: 'contact', field: 'q-contact', msg: tg ? 'Укажите телефон или ник в Telegram' : 'Укажите номер телефона' });
      else if (!(parsePhone(c) || (tg && parseNick(c)))) {
        errs.push({ name: 'contact', field: 'q-contact', msg: tg
          ? 'Номер, например +375 29 123-45-67, или ник: латиница от 5 символов, например @ivan_petrov'
          : 'Проверьте номер, например +375 29 123-45-67' });
      }
      if (!state.consent) errs.push({ name: 'consent', msg: 'Без согласия мы не можем принять заявку' });
    }
    return errs;
  }

  // Показывает ошибки текущего шага. true, если шаг заполнен правильно
  function validateStep(n) {
    var errs = stepErrors(n);
    $$('[data-error]', form).forEach(function (el) { el.hidden = true; el.textContent = ''; });
    $$('.is-invalid', form).forEach(function (el) { markInvalid(el, false); });
    errs.forEach(function (e) {
      setError(e.name, e.msg);
      if (e.field) markInvalid($('#' + e.field, form), true);
      (e.fields || []).forEach(function (k) { markInvalid($('#q-' + k, form), true); });
    });
    if (errs.length) {
      var first = errs[0];
      var target = (first.field && $('#' + first.field, form)) ||
        (first.fields && $('#q-' + first.fields[0], form)) ||
        $('[data-error="' + first.name + '"]', form);
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (target.tagName === 'INPUT') target.focus({ preventScroll: true });
      }
      track('quiz_error', { step: n + 1, field: first.name });
    }
    return !errs.length;
  }

  function go(n) {
    clearTimeout(advanceTimer);
    step = n;
    renderStep();
    track('quiz_step', { step: step + 1 });
  }

  function next() {
    if (validateStep(step)) go(step + 1);
  }

  function setDoor(value) {
    state.door = value;
    $$('[data-pick="door"]', form).forEach(function (b) {
      var on = b.getAttribute('data-value') === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (value) setError('door', '');
  }

  form.addEventListener('click', function (e) {
    var pick = e.target.closest('[data-pick]');
    if (pick) {
      var key = pick.getAttribute('data-pick');
      state[key] = pick.getAttribute('data-value');
      // обновляем выделение без перерисовки
      $$('[data-pick="' + key + '"]', form).forEach(function (b) {
        var on = b === pick;
        b.classList.toggle(b.classList.contains('chip') ? 'is-active' : 'is-selected', on);
        if (b.classList.contains('chip')) b.setAttribute('aria-pressed', String(on));
      });
      setError(key, '');
      if (key === 'door') autoDoor = false;
      // перегородка walk-in обычно без двери: подставляем, но можно поменять
      if (key === 'type') {
        if (state.type === 'walkin' && !state.door) { setDoor('Без двери'); autoDoor = true; }
        else if (state.type !== 'walkin' && autoDoor) { setDoor(''); autoDoor = false; }
      }
      if (key === 'channel') {
        var lbl = $('[data-contact-label]', form), inp = $('#q-contact', form);
        if (lbl) lbl.textContent = contactLabel() + ' *';
        if (inp) { inp.placeholder = contactPlaceholder(); inp.inputMode = state.channel === 'Telegram' ? 'text' : 'tel'; }
        if (state.contact) validateContactLive();
      }
      // одиночный выбор: сразу дальше
      if (key === 'glass' || key === 'hardware' || key === 'timing') {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(function () { go(step + 1); }, 220);
      }
    }
    if (e.target.closest('[data-quiz-close]')) closeQuiz();
  });

  form.addEventListener('input', function (e) {
    var key = e.target.getAttribute('data-bind');
    if (!key) return;
    if (e.target.type === 'checkbox') {
      state[key] = e.target.checked;
      if (key === 'noSizes') {
        $$('.q-fields--3 input', form).forEach(function (inp) { inp.disabled = e.target.checked; markInvalid(inp, false); });
        setError('sizes', '');
      }
      if (key === 'consent' && e.target.checked) setError('consent', '');
      return;
    }
    if (SIZES[key]) {
      // только цифры, без ведущих нулей
      e.target.value = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3);
    }
    state[key] = e.target.value;
    if (e.target.classList.contains('is-invalid')) markInvalid(e.target, false);
  });

  // после ухода с поля телефона: проверяем и красиво форматируем белорусский номер
  function validateContactLive() {
    var inp = $('#q-contact', form);
    var c = state.contact.trim();
    if (!inp || !c) return;
    var p = parsePhone(c);
    if (p) { state.contact = inp.value = formatPhone(p); }
    var ok = p || (state.channel === 'Telegram' && parseNick(c));
    if (ok) { setError('contact', ''); markInvalid(inp, false); }
  }
  form.addEventListener('focusout', function (e) {
    if (e.target.id === 'q-contact') validateContactLive();
    if (e.target.id === 'q-name') { state.name = e.target.value = e.target.value.replace(/\s+/g, ' ').trim(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (step < 5) { next(); return; }
    if (step === 5) submit();
  });

  function buildLead() {
    var type = TYPES.filter(function (t) { return t.id === state.type; })[0];
    var sizes = state.noSizes ? 'не знает, нужна помощь с замером'
      : ['width', 'depth', 'height'].filter(function (k) { return state[k]; })
          .map(function (k) { return SIZES[k].label.toLowerCase() + ' ' + state[k]; }).join(', ') + ' см';
    var p = parsePhone(state.contact);
    return {
      type: type ? type.label : '',
      door: state.door,
      sizes: sizes,
      needMeasureHelp: state.noSizes,
      glass: state.glass,
      hardware: state.hardware,
      timing: state.timing,
      name: state.name.trim(),
      contact: p ? formatPhone(p) : parseNick(state.contact) || state.contact.trim(),
      channel: state.channel,
      page: location.href,
      createdAt: new Date().toISOString()
    };
  }

  // Текст заявки для Telegram: пригодится, когда подключим бота
  function formatLead(l) {
    return [
      'Здравствуйте! Заявка с сайта:',
      'Тип: ' + l.type + ', дверь: ' + l.door,
      'Размеры: ' + l.sizes,
      'Стекло: ' + l.glass,
      'Фурнитура: ' + l.hardware,
      'Сроки: ' + l.timing,
      'Имя: ' + l.name,
      'Контакт: ' + l.contact + ' (' + l.channel + ')'
    ].join('\n');
  }

  // Единая точка отправки заявки: сервер api/ -> Telegram-бот
  function submitLead(lead) {
    if (!cfg.leadEndpoint) {
      console.info('[демо] заявка не отправлена, нет leadEndpoint:\n' + formatLead(lead));
      return Promise.resolve();
    }
    // бесплатный сервер на Render после простоя просыпается до минуты
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 75000);
    var hp = $('[name="website"]', form);
    return fetch(cfg.leadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: lead, website: hp ? hp.value : '' }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }, function (e) { clearTimeout(timer); throw e; });
  }

  // Будим сервер заявок заранее, пока человек читает страницу и проходит подбор
  var warmedUp = false;
  function warmUp() {
    if (warmedUp || !cfg.leadEndpoint || !window.fetch) return;
    warmedUp = true;
    fetch(cfg.leadEndpoint.replace(/\/lead$/, '/health'), { cache: 'no-store' }).catch(function () { warmedUp = false; });
  }
  setTimeout(warmUp, 3000);

  // Если отправить не вышло: даём отправить ту же заявку в WhatsApp одним нажатием
  function showSendFallback(lead) {
    var box = $('[data-send-fallback]', form);
    if (!box) {
      box = document.createElement('div');
      box.className = 'q-fallback';
      box.setAttribute('data-send-fallback', '');
      box.setAttribute('role', 'alert');
      $('.quiz__footer', form).before(box);
    }
    box.innerHTML = '<p>Не получилось отправить заявку. Отправьте её нам в WhatsApp, текст уже готов, или попробуйте ещё раз.</p>' +
      '<a class="btn btn--ghost" target="_blank" rel="noopener" href="' + esc(messengerHref('whatsapp', formatLead(lead))) + '">' +
      '<svg class="icon"><use href="#i-whatsapp"/></svg>Отправить в WhatsApp</a>';
  }

  function submit() {
    if (sending) return;
    if (!validateStep(5)) return;
    // страховка: все предыдущие шаги тоже должны быть заполнены
    for (var i = 0; i < 5; i++) {
      if (stepErrors(i).length) { go(i); validateStep(i); return; }
    }
    sending = true;
    var btn = $('button[type="submit"]', form);
    btn.disabled = true;
    btn.firstChild.textContent = 'Отправляем…';
    var slow = setTimeout(function () { btn.firstChild.textContent = 'Отправляем, ещё несколько секунд…'; }, 5000);
    var lead = buildLead();
    submitLead(lead).then(function () {
      clearTimeout(slow);
      sending = false;
      track('quiz_submit', { shower_type: lead.type, channel: lead.channel });
      go(TOTAL);
    }, function () {
      clearTimeout(slow);
      sending = false;
      btn.disabled = false;
      btn.firstChild.textContent = 'Отправить ещё раз';
      track('quiz_send_error', {});
      showSendFallback(lead);
    });
  }

  function openQuiz(preType) {
    if (step >= TOTAL) resetState();
    if (preType) {
      // тип уже выбран на странице: остаёмся на первом шаге, чтобы выбрать дверь
      if (state.type !== preType) { state.type = preType; state.door = ''; autoDoor = false; }
      if (preType === 'walkin' && !state.door) { state.door = 'Без двери'; autoDoor = true; }
      step = stepErrors(0).length ? 0 : 1;
    }
    renderStep();
    document.documentElement.classList.add('is-locked');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    var t = $('#quiz-title', form);
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    track('quiz_start', { shower_type: preType || '' });
    warmUp();
  }

  function closeQuiz() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('is-locked');
    if (step >= TOTAL) resetState();
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeQuiz(); });
  $('[data-quiz-close]', dialog).addEventListener('click', closeQuiz);
  backBtn.addEventListener('click', function () { if (step > 0) go(step - 1); });

  $$('[data-quiz-open]').forEach(function (b) {
    b.addEventListener('click', function () { openQuiz(b.getAttribute('data-quiz-open')); });
  });

  // Ссылка сразу на подбор (для рекламы и Instagram): ?quiz=1 или ?quiz=corner
  var quizParam = new URLSearchParams(location.search).get('quiz');
  if (quizParam !== null) {
    var known = TYPES.some(function (t) { return t.id === quizParam; });
    openQuiz(known ? quizParam : '');
  }

  /* ---------- демо-переключатель палитр ---------- */
  if (cfg.demoThemes) {
    var THEMES = [
      { id: 'a', name: 'Графит и латунь', swatch: 'linear-gradient(135deg,#23292F 50%,#C9A15C 50%)' },
      { id: 'b', name: 'Вода', swatch: 'linear-gradient(135deg,#0C3440 50%,#2AA3B8 50%)' },
      { id: 'c', name: 'Зелень', swatch: 'linear-gradient(135deg,#1D3A30 50%,#6E9A7E 50%)' }
    ];
    var root = document.documentElement;
    var bar = document.createElement('div');
    bar.className = 'theme-switch';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Вариант цвета');
    bar.innerHTML = '<span class="theme-switch__label">Цвет</span>' + THEMES.map(function (t) {
      return '<button type="button" data-theme-id="' + t.id + '" title="' + t.name + '" aria-label="' + t.name +
        '" style="background:' + t.swatch + '">' + t.id.toUpperCase() + '</button>';
    }).join('') + '<span class="theme-switch__name"></span>';
    document.body.appendChild(bar);
    var nameEl = $('.theme-switch__name', bar);

    var applyTheme = function (id) {
      root.setAttribute('data-theme', id);
      $$('button', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-id') === id)); });
      nameEl.textContent = THEMES.filter(function (t) { return t.id === id; })[0].name;
      try { localStorage.setItem('ks-theme', id); } catch (e) { /* приватный режим */ }
      var url = new URL(location.href);
      url.searchParams.set('theme', id);
      history.replaceState(null, '', url);
    };
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme-id]');
      if (b) applyTheme(b.getAttribute('data-theme-id'));
    });
    applyTheme(root.getAttribute('data-theme') || 'a');
  }
})();
