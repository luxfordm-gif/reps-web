/* Reps site — nothing here is required to read the page. Every behaviour is
   additive, and all of it is skipped when the reader has asked for less
   movement: the CSS leaves the static state visible in that case. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ── the nav grows a hairline once the page has moved under it ── */
  var nav = document.getElementById('nav');
  if (nav && hasIO) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (e) {
      nav.dataset.stuck = String(!e[0].isIntersecting);
    }).observe(sentinel);
  }

  if (reduced || !hasIO) return;

  /* ── hero phones: let the entry animation finish before the float starts,
        otherwise the two animations fight over `transform` ── */
  var art = document.querySelector('.hero__art');
  if (art) window.setTimeout(function () { art.classList.add('is-float'); }, 1250);

  /* ── figures and copy play once, when reached ── */
  var reveal = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
        if (entry.target.hasAttribute('data-anim')) start(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  document
    .querySelectorAll('.panel, .feature__copy, .card, .cta__inner, .grid-section__title, ' +
                      '.connector, .how__head, .how__step, .why__inner, .faq__copy, .faq__item, .soon__inner')
    .forEach(function (el, i) {
      var own = el.classList.contains('panel') ||
                el.classList.contains('connector') ||
                el.classList.contains('how__step') ||
                el.classList.contains('card');
      if (!own) {
        el.classList.add('reveal');
        el.style.transitionDelay = (i % 3) * 70 + 'ms';
      }
      reveal.observe(el);
    });

  /* ── per-figure behaviour ── */
  function start(fig) {
    var kind = fig.getAttribute('data-anim');
    if (kind === 'calc') cycleCalc(fig);
    if (kind === 'pegs' || kind === 'stats') {
      countUp(fig.closest('.feature'), kind === 'pegs' ? 900 : 300);
    }
  }

  /* The calculator steps through three loads it really produces, and the
     readout under the copy follows it. Numbers come from the app itself:
     15/55/30, 52.5/130/105, 80/185/160. */
  var LOADS = [
    { oneSide: 15,   withBar: 55,  without: 30 },
    { oneSide: 52.5, withBar: 130, without: 105 },
    { oneSide: 80,   withBar: 185, without: 160 },
  ];

  function cycleCalc(fig) {
    var shots = fig.querySelectorAll('.phone--stack img');
    var cells = document.querySelectorAll('#calculator .readout__value');
    if (shots.length < 2) return;

    var i = 0;
    window.setInterval(function () {
      if (document.hidden) return;
      shots[i].classList.remove('is-on');
      i = (i + 1) % shots.length;
      shots[i].classList.add('is-on');

      if (cells.length >= 3) {
        var load = LOADS[i];
        animate(cells[0], load.oneSide, load.oneSide % 1 ? 1 : 0, '');
        animate(cells[1], load.withBar, 0, '');
        animate(cells[2], load.without, 0, '');
      }
    }, 3200);
  }

  /* Numbers run up to their value the first time their section is reached. */
  function countUp(scope, delay) {
    if (!scope) return;
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var dp = parseInt(el.getAttribute('data-dp'), 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      window.setTimeout(function () { animate(el, to, dp, prefix); }, delay);
    });
  }

  /* Writes into the element's first text node so any nested unit <span>
     ("kg", "%", "/4") survives the update. */
  function animate(el, to, dp, prefix) {
    var node = firstText(el);
    if (!node) return;
    var from = parseFloat(String(node.nodeValue).replace(/[^0-9.-]/g, '')) || 0;
    var t0 = 0;

    function frame(now) {
      if (!t0) t0 = now;
      var p = Math.min((now - t0) / 900, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.nodeValue = (prefix || '') + (from + (to - from) * eased).toFixed(dp);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function firstText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) return el.childNodes[i];
    }
    return null;
  }
})();
