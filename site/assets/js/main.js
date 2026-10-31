/* gouri-demo.resonor.in · motion
   No libraries: letter drops, scroll reveals, smooth wheel scrolling,
   parallax, a pinned horizontal gallery, counters and a lightbox. */
(() => {
  'use strict';
  window.__motion = true;

  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) html.classList.add('reduce');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = matchMedia('(min-width: 901px)');

  /* ---------- split text into letters / words ---------- */
  function split(el) {
    const mode = el.dataset.split;
    if (!el.hasAttribute('aria-hidden') && !el.closest('[aria-label]')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const frag = document.createDocumentFragment();
    const walk = (node, out) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            if (mode === 'words') {
              const wi = document.createElement('span');
              wi.className = 'wi';
              wi.textContent = part;
              wi.style.setProperty('--i', i++);
              w.appendChild(wi);
            } else {
              [...part].forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'c';
                c.textContent = ch;
                c.style.setProperty('--i', i++);
                c.style.setProperty('--r', `${rand(-35, 35).toFixed(1)}deg`);
                w.appendChild(c);
              });
            }
            out.appendChild(w);
          });
        } else if (n.nodeName === 'BR') {
          out.appendChild(document.createElement('br'));
        } else if (n.nodeType === 1) {
          const clone = n.cloneNode(false);
          walk(n, clone);
          out.appendChild(clone);
        }
      });
    };
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
  }
  $$('[data-split]').forEach(split);

  /* stagger indices and random spins for groups */
  $$('[data-stagger], [data-pile]').forEach((g) => {
    [...g.children].forEach((c, i) => {
      c.style.setProperty('--i', i);
      c.style.setProperty('--spin', `${rand(-50, 50).toFixed(0)}deg`);
      if (g.hasAttribute('data-pile')) c.style.setProperty('--rot', `${rand(-5, 5).toFixed(1)}deg`);
    });
  });

  /* ---------- counters ---------- */
  const fmt = (n, k) => (k && n >= 1000 ? `${(n / 1000).toFixed(1)}K` : Math.round(n).toLocaleString('en-IN'));
  function count(el) {
    const end = +el.dataset.count;
    const k = el.dataset.fmt === 'k';
    const t0 = performance.now();
    const dur = 1800;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(end * (p === 1 ? 1 : e), k);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- typewriter ---------- */
  function type(el) {
    const text = el.textContent;
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 75 + Math.random() * 60);
      else setTimeout(() => el.classList.remove('typing'), 1600);
    };
    tick();
  }

  /* ---------- reveal on scroll ---------- */
  const hero = $('.hero');
  const reveal = (el) => {
    el.classList.add('in');
    if (el.hasAttribute('data-count') && !reduce) count(el);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      reveal(e.target);
      $$('[data-count]', e.target).forEach((c) => !reduce && count(c));
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  $$('[data-split], [data-reveal], [data-pop], [data-stagger], [data-pile], .reach__item')
    .filter((el) => !hero.contains(el))
    .forEach((el) => io.observe(el));

  /* ---------- hero intro ---------- */
  function intro() {
    const d = (el, ms) => el && el.style.setProperty('--d', `${ms}ms`);
    $$('.hero [data-pop]').forEach((s, i) => d(s, 1100 + i * 180));
    d($('.hero__line--2'), 650);
    $$('.hero [data-split], .hero [data-pop], .hero [data-reveal]').forEach(reveal);
    const t = $('.hero [data-type]');
    if (t) reduce ? t.classList.add('in') : setTimeout(() => type(t), 1500);
    setTimeout(() => hero.classList.add('settled'), 2600);
  }
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  fontsReady.then(() => requestAnimationFrame(intro));

  /* ---------- marquee: duplicate so it loops ---------- */
  const mTrack = $('.marquee__track');
  const mClone = mTrack.innerHTML;
  mTrack.insertAdjacentHTML('beforeend', `<span aria-hidden="true" style="display:contents">${mClone}</span>`);

  /* ---------- smooth wheel scrolling (desktop only) ---------- */
  let target = scrollY;
  let current = scrollY;
  let smoothing = false;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const lightbox = $('.lightbox');

  if (finePointer && !reduce) {
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || lightbox.open) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      if (!smoothing) current = target = scrollY;
      target = clamp(target + delta, 0, maxScroll());
      smoothing = true;
    }, { passive: false });
  }
  addEventListener('scroll', () => { if (!smoothing) target = current = scrollY; }, { passive: true });

  function scrollToEl(el) {
    const y = clamp(el.getBoundingClientRect().top + scrollY, 0, maxScroll());
    if (reduce) { scrollTo(0, y); return; }
    if (finePointer) { current = scrollY; target = y; smoothing = true; }
    else scrollTo({ top: y, behavior: 'smooth' });
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = id === 'top' ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    history.replaceState(null, '', `#${id}`);
  }));

  /* ---------- per-frame updates ---------- */
  const heroLetters = $$('.hero__title .c').map((c) => ({ c, dx: rand(-260, 260), dy: rand(-120, 380), r: rand(-90, 90) }));
  const parallax = $$('[data-speed]').map((el) => ({ el, s: +el.dataset.speed }));
  const spinners = $$('[data-spin]').map((el) => ({ el, s: +el.dataset.spin }));
  const expList = $('.exp__list');
  const expLine = $('.exp__line');
  const aodn = $('[data-hscroll]');
  const aodnTrack = aodn && $('.aodn__track', aodn);
  const nav = $('.nav');
  const navLinks = $$('.nav nav a');
  const sections = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  const cursor = $('.cursor');
  let mx = -100, my = -100, cx = -100, cy = -100;
  let mX = 0, lastY = scrollY, vel = 0, lastT = performance.now(), dir = 1;

  function sizeAodn() {
    if (!aodn) return;
    if (wide.matches && !reduce) aodn.style.height = `${aodnTrack.scrollWidth - innerWidth + innerHeight}px`;
    else { aodn.style.height = ''; aodnTrack.style.transform = ''; }
  }
  sizeAodn();
  addEventListener('resize', sizeAodn);
  addEventListener('load', sizeAodn);

  function frame(t) {
    const dt = Math.min(64, t - lastT) / 16.67;
    lastT = t;

    if (smoothing) {
      current += (target - current) * 0.11 * dt;
      if (Math.abs(target - current) < 0.5) { current = target; smoothing = false; }
      scrollTo(0, current);
    }

    const y = scrollY;
    vel += ((y - lastY) - vel) * 0.2;
    if (Math.abs(y - lastY) > 0.5) dir = y > lastY ? 1 : -1;
    const delta = y - lastY;
    lastY = y;

    if (!reduce) {
      // hero letters scatter as you scroll away
      if (hero.classList.contains('settled')) {
        const p = clamp(y / innerHeight, 0, 1.2);
        const e = p * p;
        heroLetters.forEach(({ c, dx, dy, r }) => {
          c.style.translate = `${dx * e}px ${dy * e}px`;
          c.style.rotate = `${r * e}deg`;
        });
      }

      // parallax
      const vh = innerHeight;
      parallax.forEach(({ el, s }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * s).toFixed(1)}px`;
      });

      // stickers spin with scroll
      spinners.forEach(({ el, s }) => { el.style.transform = `rotate(${(y * s).toFixed(1)}deg)`; });

      // experience line draws itself
      if (expLine && expList) {
        const r = expList.getBoundingClientRect();
        const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.3), 0, 1);
        expLine.style.setProperty('--draw', (1 - p).toFixed(3));
      }

      // pinned horizontal campaign gallery
      if (aodn && wide.matches) {
        const r = aodn.getBoundingClientRect();
        const dist = aodnTrack.scrollWidth - innerWidth;
        const p = clamp(-r.top / (r.height - vh), 0, 1);
        aodnTrack.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
      }

      // marquee speed reacts to scroll speed and direction
      const half = mTrack.scrollWidth / 2;
      mX -= (1.1 + Math.min(Math.abs(vel), 60) * 0.35) * dir * dt;
      if (mX <= -half) mX += half;
      if (mX > 0) mX -= half;
      mTrack.style.transform = `translate3d(${mX.toFixed(1)}px,0,0)`;
    }

    // nav hides on the way down, returns on the way up
    if (y > innerHeight * 0.6 && delta > 2) nav.classList.add('is-hidden');
    else if (delta < -2 || y < 100) nav.classList.remove('is-hidden');

    // active nav link
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.45) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));

    // cursor
    if (finePointer) {
      cx += (mx - cx) * 0.22 * dt;
      cy += (my - cy) * 0.22 * dt;
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (finePointer) {
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('pointerover', (e) => cursor.classList.toggle('is-view', !!e.target.closest('.piece')));
    document.addEventListener('pointerleave', () => { mx = my = -100; });
  }

  /* ---------- lightbox ---------- */
  const pieces = $$('.piece');
  const lbImg = $('img', lightbox);
  const lbCap = $('figcaption', lightbox);
  let idx = 0;
  const caption = (p) => p.dataset.cap || ($('figcaption', p) || {}).textContent || $('img', p).alt;
  function show(i) {
    idx = (i + pieces.length) % pieces.length;
    const img = $('img', pieces[idx]);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = caption(pieces[idx]);
    const fig = $('figure', lightbox);
    fig.style.animation = 'none';
    void fig.offsetWidth;
    fig.style.animation = '';
  }
  pieces.forEach((p, i) => {
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', `View: ${caption(p)}`);
    const open = () => { smoothing = false; show(i); lightbox.showModal(); };
    p.addEventListener('click', open);
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  $('.lightbox__close').addEventListener('click', () => lightbox.close());
  $('.lightbox__nav--prev').addEventListener('click', () => show(idx - 1));
  $('.lightbox__nav--next').addEventListener('click', () => show(idx + 1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  const yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
