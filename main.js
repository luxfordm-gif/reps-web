/* Reps site — nothing here is required to read the page. Every behaviour is
   additive, and all of it is skipped when the reader has asked for less
   movement: the CSS leaves the static state visible in that case. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* The hero's film autoplays from the markup, so stillness has to be taken
     away rather than withheld — and before the reduced-motion return below,
     which is where everything else stops. This script is deferred, so a frame
     or two may have gone by; winding back to the start leaves the poster's own
     frame on screen, which is what that reader would have had anyway. */
  var film = document.querySelector('.phone__film');
  if (film && reduced) {
    film.removeAttribute('autoplay');
    film.pause();
    film.currentTime = 0;
  }

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

  /* ── the nav marks the section you are in, and the rule slides to it ──
     Location rather than motion, so it sits above the reduced-motion return
     below: a reader who asked for stillness still gets to see where they are,
     and the reduced-motion block turns the slide into a jump. */
  var bar = nav && nav.querySelector('.nav__links');
  var inner = nav && nav.querySelector('.nav__inner');
  var ink = inner && inner.querySelector('.nav__ink');
  if (bar && ink && inner) {
    var marks = [];
    [].forEach.call(bar.querySelectorAll('a'), function (a) {
      var section = document.getElementById(a.getAttribute('href').slice(1));
      if (section) marks.push({ link: a, section: section });
    });

    var at = -1;
    function paint(force) {
      /* Below 1000px the links are display:none, so there is nothing to
         measure — an empty rect would park the rule at the left. The rule
         hangs off .nav__inner now, which stays visible, so it has to be put
         away by hand: leaving it up would strand it under a bar with no
         links after a resize down. */
      if (!bar.offsetParent) {
        if (at > -1) marks[at].link.removeAttribute('aria-current');
        at = -1;
        inner.removeAttribute('data-on');
        return;
      }

      /* The section you are "in" is the last one whose top has passed under
         the nav. Two sections have no link of their own, so the previous
         one simply stays marked while you read them, which is what a reader
         would say is true anyway. */
      /* Comfortably below the 88px scroll-padding an anchor jump lands on:
         at nav height + 8 a clicked link put its section 8px short of the
         line, so the nav still marked the section above it. */
      var line = nav.offsetHeight + 24;
      var now = -1, i;
      for (i = 0; i < marks.length; i++) {
        if (marks[i].section.getBoundingClientRect().top <= line) now = i;
      }
      if (now === at && !force) return;

      if (at > -1) marks[at].link.removeAttribute('aria-current');
      at = now;
      if (at < 0) { inner.removeAttribute('data-on'); return; }

      /* Measured against .nav__inner, which is what the rule hangs off now.
         offsetLeft would answer relative to whichever ancestor happens to be
         positioned; two rects subtracted are relative to what we asked. */
      var a = marks[at].link.getBoundingClientRect();
      var box = inner.getBoundingClientRect();
      marks[at].link.setAttribute('aria-current', 'true');
      ink.style.setProperty('--ink-x', (a.left - box.left) + 'px');
      ink.style.setProperty('--ink-w', a.width + 'px');
      inner.setAttribute('data-on', '');
    }

    var queued = false;
    function schedule(force) {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; paint(force); });
    }
    window.addEventListener('scroll', function () { schedule(false); }, { passive: true });
    /* A resize moves the links, so the rule is remeasured even where the
       section it belongs to has not changed. */
    window.addEventListener('resize', function () { schedule(true); });
    paint(true);
  }

  /* ── FAQ: first answer open on desktop, all closed on a phone ──
     Deliberately above the reduced-motion return: this is layout, not motion,
     and someone who has asked for less movement still wants the answers open
     on a wide screen. Matches the 1000px breakpoint the FAQ lays out on.
     Without JavaScript they stay closed, which is still perfectly usable. */
  var wide = window.matchMedia('(min-width: 1001px)');
  var faqs = document.querySelectorAll('.faq__item');

  // Desktop opens the first answer only — enough to show the section is
  // readable without dumping every answer on the page at once.
  function syncFaq(mq) {
    for (var i = 0; i < faqs.length; i++) faqs[i].open = mq.matches && i === 0;
  }

  if (faqs.length) {
    syncFaq(wide);
    // Only fires when the breakpoint is actually crossed, so a reader's own
    // open/closed choices survive an ordinary resize.
    if (wide.addEventListener) wide.addEventListener('change', syncFaq);
    else if (wide.addListener) wide.addListener(syncFaq);
  }

  /* ── the headline keeps its two lines, whatever size the text comes out ──
     Above the reduced-motion return with the FAQ, for the same reason: this
     is layout, not movement.

     The stylesheet sizes the headline off the column with about 10% to spare,
     which covers every width and the difference between General Sans and the
     fallback it is read in first. What it cannot see is a browser that
     renders text larger than it asked for — an in-app browser carrying the
     reader’s system font scale is the usual one, and 1.15× is ordinary. The
     written break then lands mid-phrase and both lines wrap, which is how a
     two-line headline becomes four ragged ones.

     So measure rather than guess: lay each line out without wrapping, and if
     the longer one has outgrown the column, hand the ratio back to the
     stylesheet. A headline that already fits is left alone. */
  var title = document.querySelector('.hero__title');
  var titleLines = title ? title.querySelectorAll('.hero__title-line') : [];
  if (titleLines.length) {
    var titleRange = document.createRange();

    function fitTitle() {
      /* Measured at full size every time, so the answer is never derived from
         a shrink already applied — a resize back up has to be able to undo
         one. Nothing paints between here and the value set below. */
      title.style.setProperty('--title-fit', '1');
      title.style.whiteSpace = 'nowrap';

      var room = title.getBoundingClientRect().width;
      var widest = 0, i, rect;
      for (i = 0; i < titleLines.length; i++) {
        /* A range rather than the element: on a phone the copy is centred, so
           a nowrap line overflows both edges and scrollWidth would only count
           the half of it the reader could scroll to. */
        titleRange.selectNodeContents(titleLines[i]);
        rect = titleRange.getBoundingClientRect();
        if (rect.width > widest) widest = rect.width;
      }

      title.style.whiteSpace = '';
      if (!room || !widest || widest <= room) return;
      /* Half a pixel off the column, so rounding cannot land the line back on
         the edge it was just pulled off; and a floor, so a browser we have
         not thought of cannot shrink the headline into the body copy. */
      title.style.setProperty('--title-fit', Math.max((room - 0.5) / widest, 0.72).toFixed(4));
    }

    fitTitle();
    /* The first measurement is taken in whatever font is up. General Sans
       arrives over the network and runs wider than the fallback, so the
       answer is worth taking again once it lands. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

    var titleQueued = false;
    window.addEventListener('resize', function () {
      if (titleQueued) return;
      titleQueued = true;
      window.requestAnimationFrame(function () { titleQueued = false; fitTitle(); });
    });
  }

  if (reduced || !hasIO) return;

  /* ── hero phones: let the entry animation finish before the float starts,
        otherwise the two animations fight over `transform` ── */
  var art = document.querySelector('.hero__art');
  if (art) window.setTimeout(function () { art.classList.add('is-float'); }, 1250);

  /* The attribute does the starting; this is for the browsers that defer it
     until the element is on screen, and for coming back from a hidden tab.
     play() rejects when a browser declines to play even a muted video — that
     is its right, and the poster is already the fallback. */
  if (film) {
    film.play().catch(function () {});
    /* Nothing to show while the tab is in the background. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) film.pause();
      else film.play().catch(function () {});
    });
  }

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
    if (kind === 'sync') cycleSync(fig);
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

  /* Cross-fades a .phone--stack through its frames, and hands the new index
     to whatever else has to move with it. Nothing runs while the tab is
     hidden: a background tab would otherwise burn through the loop and come
     back mid-fade. */
  function cycleShots(scope, ms, onStep) {
    var shots = scope.querySelectorAll('.phone--stack img');
    if (shots.length < 2) return;

    /* A frame can ask for its own dwell with data-ms — the hero's plates pile
       on in a second each, while the screens worth reading hold for three. */
    function dwell(n) {
      return parseInt(shots[n].getAttribute('data-ms'), 10) || ms;
    }

    var i = 0;
    (function next() {
      window.setTimeout(function () {
        if (!document.hidden) {
          shots[i].classList.remove('is-on');
          i = (i + 1) % shots.length;
          shots[i].classList.add('is-on');
          if (onStep) onStep(i);
        }
        next();
      }, dwell(i));
    })();
  }

  function cycleCalc(fig) {
    var cells = document.querySelectorAll('#calculator .readout__value');
    cycleShots(fig, 1700, function (i) {
      if (cells.length < 3) return;
      var load = LOADS[i];
      animate(cells[0], load.oneSide, load.oneSide % 1 ? 1 : 0, '', 460);
      animate(cells[1], load.withBar, 0, '', 460);
      animate(cells[2], load.without, 0, '', 460);
    });
  }

  /* The offline card plays its whole story on a loop: three sets logged with
     no signal, then the connection returns and they go up. One class does it —
     the CSS holds every step — so the two halves cannot drift apart. The
     offline half is shorter; it is the part the reader already believes. */
  function cycleSync(fig) {
    var card = fig.querySelector('.offline-card');
    if (!card) return;

    var online = false;
    (function next() {
      window.setTimeout(function () {
        if (!document.hidden) {
          online = !online;
          card.classList.toggle('is-online', online);
        }
        next();
      }, online ? 3200 : 2600);
    })();
  }

  /* Numbers run up to their value the first time their section is reached.
     A number can carry its own timing: data-from winds it back to a starting
     value (so the markup can hold the finished figure for anyone without
     motion), and data-delay / data-ms pace it against something else moving —
     the bench figure runs alongside the chart line drawing beneath it. */
  function countUp(scope, delay) {
    if (!scope) return;
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var dp = parseInt(el.getAttribute('data-dp'), 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      var from = el.getAttribute('data-from');
      var wait = el.hasAttribute('data-delay') ? parseInt(el.getAttribute('data-delay'), 10) : delay;
      var ms = parseInt(el.getAttribute('data-ms'), 10) || undefined;
      if (from !== null) {
        var node = firstText(el);
        if (node) node.nodeValue = prefix + parseFloat(from).toFixed(dp);
      }
      window.setTimeout(function () { animate(el, to, dp, prefix, ms); }, wait);
    });
  }

  /* Writes into the element's first text node so any nested unit <span>
     ("kg", "%", "/4") survives the update. */
  function animate(el, to, dp, prefix, ms) {
    var node = firstText(el);
    if (!node) return;
    var from = parseFloat(String(node.nodeValue).replace(/[^0-9.-]/g, '')) || 0;
    var dur = ms || 900;
    var t0 = 0;

    function frame(now) {
      if (!t0) t0 = now;
      var p = Math.min((now - t0) / dur, 1);
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
