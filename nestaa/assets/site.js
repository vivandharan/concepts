/* Cafe Nestaa concept — Lenis smooth scroll + Barba page transitions */
(() => {
  const WA = 'https://wa.me/919945016363?text=';
  const waLink = (msg) => WA + encodeURIComponent(msg);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // ---------- Lenis ----------
  const lenis = reduced || !window.Lenis ? null : new Lenis({ autoRaf: true, lerp: 0.11 });
  window.__lenis = lenis; // handy for debugging in the console
  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { offset: -70, ...opts });
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (typeof target === 'number') window.scrollTo(0, target);
      else if (el) el.scrollIntoView();
    }
  };
  // Links to the page we're already on: scroll with Lenis instead of reloading.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('data-wa')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    e.preventDefault();
    const el = url.hash.length > 1 && document.querySelector(url.hash);
    scrollTo(el || 0);
    history.replaceState(null, '', url.hash || location.pathname);
  });

  // ---------- per-page setup ----------
  function bindWA(root) {
    root.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
  }
  function markNav(ns) {
    document.querySelectorAll('.topbar nav a').forEach((a) => {
      if (a.dataset.ns === ns) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('is-board', ns === 'menu');
  }

  function initHome(c) {
    // One orchestrated moment: balloons rise behind the name.
    if (!reduced) {
      c.querySelectorAll('.balloon').forEach((b, i) => {
        b.animate(
          [{ transform: `translateY(110vh) rotate(${b.dataset.r * -2}deg)` }, { transform: `translateY(-8px) rotate(${b.dataset.r * 1}deg)`, offset: 0.85 }, { transform: `translateY(0) rotate(${b.dataset.r}deg)` }],
          { duration: 1700 + i * 160, delay: 150 + i * 90, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }
        );
      });
    } else c.querySelectorAll('.balloon').forEach((b) => (b.style.transform = `rotate(${b.dataset.r}deg)`));

    const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img');
    c.querySelectorAll('.gal button').forEach((btn) => btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      lbImg.src = img.src.replace(/w=\d+&h=\d+&fit=crop/, 'w=1200'); lbImg.alt = img.alt;
      lb.classList.add('open'); lenis && lenis.stop(); lb.querySelector('button').focus();
    }));
  }
  const lb = document.getElementById('lightbox');
  if (lb) {
    const close = () => { lb.classList.remove('open'); lenis && lenis.start(); };
    lb.addEventListener('click', (e) => { if (e.target.tagName !== 'IMG') close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }

  function initMenu(c) {
    const links = [...c.querySelectorAll('.cats a')];
    const secs = links.map((a) => c.querySelector(a.getAttribute('href')));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach((s) => s && io.observe(s));
  }

  function initCelebrate(c) {
    const f = c.querySelector('#bookingForm');
    const bubble = c.querySelector('#bubble');
    const today = isoDay(new Date());
    f.date.min = today;

    // package tags <-> form select stay in sync
    const tags = [...c.querySelectorAll('.tag')];
    const setPkg = (v) => { f.package.value = v; tags.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.pkg === v))); render(); };
    tags.forEach((t) => t.addEventListener('click', () => { setPkg(t.dataset.pkg); scrollTo('#book'); }));
    f.package.addEventListener('change', () => setPkg(f.package.value));
    const qp = new URLSearchParams(location.search).get('pkg');

    const g = f.guests;
    c.querySelector('#gMinus').onclick = () => { g.value = Math.max(1, (+g.value || 1) - 1); render(); };
    c.querySelector('#gPlus').onclick = () => { g.value = Math.min(40, (+g.value || 0) + 1); render(); };

    const fmtDate = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
    const fmtTime = (v) => { let [h, m] = v.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };

    function lines(blank) {
      const b = (v) => v || blank;
      const when = f.date.value || f.time.value ? `${f.date.value ? fmtDate(f.date.value) : blank}, ${f.time.value ? fmtTime(f.time.value) : blank}` : blank;
      const out = [
        "Hi Cafe Nestaa! I'd like to book a celebration.",
        `Name: ${b(f.name.value.trim())}`,
        `Occasion: ${b(f.occasion.value)}`,
        `Date: ${when}`,
        `Guests: ${b(g.value)}`,
        `Package: ${b(f.package.value)}`,
      ];
      if (f.notes.value.trim()) out.push(`Notes: ${f.notes.value.trim()}`);
      return out;
    }
    function render() {
      const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
      bubble.innerHTML = lines('\u0000').map(esc).join('\n').replace(/\u0000/g, '<span class="blank">…</span>');
    }
    f.addEventListener('input', render);
    f.addEventListener('change', render);

    function setErr(field, msg) {
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      c.querySelector('#' + field.id + '-err').textContent = msg || '';
      return !msg;
    }
    function validate() {
      let first = null;
      const check = (field, msg) => { if (!setErr(field, msg)) first = first || field; };
      check(f.name, f.name.value.trim().length < 2 ? 'Add your name so we know who to expect.' : '');
      check(f.occasion, !f.occasion.value ? 'Choose what you are celebrating.' : '');
      check(f.date, !f.date.value ? 'Choose a date.' : f.date.value < today ? 'That date has passed. Choose today or later.' : '');
      check(f.time, !f.time.value ? 'Choose a time.' : f.time.value < '11:00' || f.time.value > '21:30' ? 'We are open 11 AM to 10 PM. Choose a time before 9:30 PM.' : '');
      check(g, !(+g.value >= 1 && +g.value <= 40) ? 'Guests must be between 1 and 40.' : '');
      if (first) first.focus();
      return !first;
    }
    ['name', 'occasion', 'date', 'time', 'guests'].forEach((k) => f[k].addEventListener('change', () => f[k].getAttribute('aria-invalid') === 'true' && validate()));

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const url = waLink(lines('').join('\n'));
      const btn = c.querySelector('#submitBtn'), label = btn.querySelector('span');
      btn.disabled = true; label.textContent = 'Opening WhatsApp…';
      setTimeout(() => {
        if (!window.open(url, '_blank')) location.href = url;
        btn.disabled = false; label.textContent = 'Send booking on WhatsApp';
      }, 300);
    });

    setPkg(qp && tags.some((t) => t.dataset.pkg === qp) ? qp : f.package.value);
  }

  const INIT = { home: initHome, menu: initMenu, celebrate: initCelebrate };
  function initPage(container) {
    const ns = container.dataset.barbaNamespace;
    bindWA(document);
    markNav(ns);
    INIT[ns] && INIT[ns](container);
  }

  // ---------- Barba ----------
  const curtain = document.querySelector('.curtain');
  const TITLES = { home: 'Cafe Nestaa', menu: 'The menu', celebrate: 'Celebrate' };
  const anim = (el, kf, o) => (reduced ? Promise.resolve() : el.animate(kf, { fill: 'forwards', ...o }).finished);

  if (window.barba) {
    barba.init({
      preventRunning: true,
      prevent: ({ el, href }) => el.hasAttribute('data-no-barba') || new URL(href, location.href).pathname === location.pathname,
      transitions: [{
        name: 'curtain',
        async leave({ next }) {
          const ns = next.namespace || (next.url.path || '').match(/(menu|celebrate)/)?.[1] || 'home';
          curtain.querySelector('.curtain-title').textContent = TITLES[ns] || '';
          curtain.classList.add('on');
          await anim(curtain, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)' });
        },
        enter({ next, trigger }) {
          // old container is gone by now; measure the new page before jumping
          lenis && lenis.resize();
          const href = (trigger && trigger.getAttribute && trigger.getAttribute('href')) || location.href;
          const hash = href.includes('#') ? href.split('#')[1] : location.hash.slice(1);
          const target = hash && next.container.querySelector('#' + CSS.escape(hash));
          if (lenis) lenis.scrollTo(target || 0, { immediate: true, force: true, offset: target ? -70 : 0 });
          else target ? target.scrollIntoView() : window.scrollTo(0, 0);
          return anim(curtain, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 560, delay: 120, easing: 'cubic-bezier(.7,0,.3,1)' })
            .then(() => { curtain.getAnimations().forEach((a) => a.cancel()); curtain.classList.remove('on'); });
        },
      }],
    });
    barba.hooks.after(({ next }) => {
      initPage(next.container);
      lenis && lenis.resize();
      next.container.querySelector('h1')?.focus({ preventScroll: true });
    });
  }
  initPage(document.querySelector('[data-barba="container"]'));
  if (location.hash) setTimeout(() => scrollTo(location.hash, { immediate: true }), 50);
})();
