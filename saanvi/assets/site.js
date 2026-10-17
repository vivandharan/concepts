/* Saanvi concept — Lenis smooth scroll + Barba page transitions */
(() => {
  const WA = 'https://wa.me/917338114466?text=';
  const waLink = (msg) => WA + encodeURIComponent(msg);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const wk = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const dm = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // ---------- Lenis ----------
  const lenis = reduced || !window.Lenis ? null : new Lenis({ autoRaf: true, lerp: 0.1 });
  window.__lenis = lenis; // handy for debugging in the console
  const scrollTo = (target, opts = {}) => {
    if (lenis) return lenis.scrollTo(target, { offset: -60, ...opts });
    if (typeof target === 'number') window.scrollTo(0, target);
    else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView();
  };
  // Links to the page we're already on: scroll instead of reloading.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('data-wa')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    e.preventDefault();
    scrollTo((url.hash.length > 1 && document.querySelector(url.hash)) || 0);
    history.replaceState(null, '', url.hash || location.pathname);
  });

  // ---------- measuring tape: 40px = 1 cm, moves with the page ----------
  const roll = document.querySelector('.tape-roll'), nums = document.querySelector('.tape-nums');
  function buildTape() {
    const h = document.documentElement.scrollHeight + innerHeight;
    roll.style.height = nums.style.height = h + 'px';
    let html = '';
    for (let cm = 1; cm * 40 < h; cm++) html += `<span class="${cm % 10 ? '' : 'ten'}" style="top:${cm * 40}px">${cm}</span>`;
    nums.innerHTML = html;
  }
  const moveTape = (y) => { const t = `translate3d(0,${-y}px,0)`; roll.style.transform = t; nums.style.transform = t; };
  if (lenis) lenis.on('scroll', ({ scroll }) => moveTape(scroll));
  else addEventListener('scroll', () => moveTape(scrollY), { passive: true });

  // ---------- per-page ----------
  function bindWA(root) {
    root.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
  }
  function markNav(ns) {
    document.querySelectorAll('.topbar nav a').forEach((a) => (a.dataset.ns === ns ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  }

  function initLookbook(c) {
    const looks = [...c.querySelectorAll('.look')];
    const btns = [...c.querySelectorAll('.filters button')];
    function layout(filter) {
      let i = 0;
      looks.forEach((el) => {
        const show = filter === 'all' || el.dataset.cat === filter;
        el.hidden = !show;
        el.classList.remove('big', 'half', 'drop', 'open');
        if (!show) return;
        // rhythm: one big look, then a staggered pair
        const k = i % 3;
        el.classList.add(k === 0 ? 'big' : 'half');
        if (k === 2) el.classList.add('drop');
        i++;
      });
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
      lenis && lenis.resize();
      buildTape();
    }
    btns.forEach((b) => b.addEventListener('click', () => layout(b.dataset.f)));
    looks.forEach((el) => {
      const t = () => { el.classList.toggle('open'); el.setAttribute('aria-expanded', el.classList.contains('open')); };
      el.addEventListener('click', t);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
    });
    layout('all');
  }

  function initBook(c) {
    const f = c.querySelector('#consultForm');
    const bubble = c.querySelector('#bubble');
    const now = new Date();
    f.eventDate.min = iso(now);

    // Next six open days. Sundays are never offered; after 6 PM today is skipped.
    const days = [], d = new Date(now);
    if (now.getHours() >= 18) d.setDate(d.getDate() + 1);
    while (days.length < 6) { if (d.getDay() !== 0) days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    c.querySelector('#dayChips').innerHTML = days.map((x, i) => `
      <div class="chip"><input type="radio" name="day" id="d${i}" value="${iso(x)}"><label for="d${i}">${iso(x) === iso(now) ? 'Today' : wk(x)}<small>${dm(x)}</small></label></div>`).join('');

    const occ = () => f.occasion.value ? f.occasion.value + (f.eventDate.value ? ` — ${dm(new Date(f.eventDate.value + 'T12:00'))}` : '') : '';
    const visit = () => {
      const day = f.querySelector('input[name=day]:checked');
      if (!day) return '';
      const x = new Date(day.value + 'T12:00');
      return `${wk(x)} ${dm(x)}, ${f.slot.value}`;
    };
    function lines(blank) {
      const b = (v) => v || blank;
      const out = [
        "Hi Saanvi! I'd like to book a consultation.",
        `Name: ${b(f.name.value.trim())}`,
        `Outfit: ${b(f.outfit.value)}`,
        `Occasion: ${b(occ())}`,
        `Preferred visit: ${b(visit())}`,
      ];
      if (f.notes.value.trim()) out.push(`Notes: ${f.notes.value.trim()}`);
      return out;
    }
    const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
    const render = () => { bubble.innerHTML = lines('\u0000').map(esc).join('\n').replace(/\u0000/g, '<span class="blank">…</span>'); };
    f.addEventListener('input', render);
    f.addEventListener('change', render);

    function setErr(id, msg, field) {
      field && field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      c.querySelector('#' + id + '-err').textContent = msg || '';
      return !msg;
    }
    function validate() {
      let first = null;
      const check = (id, field, msg, focusEl) => { if (!setErr(id, msg, field)) first = first || focusEl || field; };
      check('name', f.name, f.name.value.trim().length < 2 ? 'Add your name so Supriya knows who is coming.' : '');
      check('outfit', f.outfit, !f.outfit.value ? 'Choose what you would like made.' : '');
      check('occasion', f.occasion, !f.occasion.value ? 'Choose the occasion.' : '');
      check('eventDate', f.eventDate, f.eventDate.value && f.eventDate.value < iso(now) ? 'That date has passed. Choose a future date or leave it empty.' : '');
      const day = f.querySelector('input[name=day]:checked');
      const sunday = day && new Date(day.value + 'T12:00').getDay() === 0;
      check('day', null, !day ? 'Choose a day to visit, Monday to Saturday.' : sunday ? "We're closed on Sundays. Choose Monday to Saturday." : '', c.querySelector('#d0'));
      if (first) first.focus();
      return !first;
    }
    f.addEventListener('change', () => { if (f.querySelector('[aria-invalid="true"]') || c.querySelector('#day-err').textContent) validate(); });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const url = waLink(lines('').join('\n'));
      const btn = c.querySelector('#submitBtn'), label = btn.querySelector('span');
      btn.disabled = true; label.textContent = 'Opening WhatsApp…';
      setTimeout(() => {
        if (!window.open(url, '_blank')) location.href = url;
        btn.disabled = false; label.textContent = 'Request a visit on WhatsApp';
      }, 300);
    });
    render();
  }

  const INIT = { lookbook: initLookbook, book: initBook };
  function initPage(container) {
    const ns = container.dataset.barbaNamespace;
    bindWA(document);
    markNav(ns);
    INIT[ns] && INIT[ns](container);
    buildTape();
    moveTape(lenis ? lenis.scroll : scrollY);
  }
  addEventListener('load', buildTape);
  addEventListener('resize', buildTape);

  // ---------- Barba: a length of silk pulled across the table ----------
  const curtain = document.querySelector('.curtain');
  const TITLES = { home: 'Saanvi', lookbook: 'Lookbook', book: 'Book a consultation' };
  const anim = (el, kf, o) => (reduced ? Promise.resolve() : el.animate(kf, { fill: 'forwards', ...o }).finished);

  if (window.barba) {
    barba.init({
      preventRunning: true,
      prevent: ({ el, href }) => el.hasAttribute('data-no-barba') || new URL(href, location.href).pathname === location.pathname,
      transitions: [{
        name: 'silk',
        async leave({ trigger }) {
          const href = (trigger && trigger.getAttribute && trigger.getAttribute('href')) || '';
          const ns = /lookbook/.test(href) ? 'lookbook' : /book/.test(href) ? 'book' : 'home';
          curtain.querySelector('.curtain-title').textContent = TITLES[ns];
          curtain.classList.add('on');
          await anim(curtain, [{ transform: 'translateX(-101%)' }, { transform: 'translateX(0)' }], { duration: 560, easing: 'cubic-bezier(.65,0,.35,1)' });
        },
        enter({ next, trigger }) {
          lenis && lenis.resize();
          const href = (trigger && trigger.getAttribute && trigger.getAttribute('href')) || location.href;
          const hash = href.includes('#') ? href.split('#')[1] : location.hash.slice(1);
          const target = hash && next.container.querySelector('#' + CSS.escape(hash));
          if (lenis) lenis.scrollTo(target || 0, { immediate: true, force: true, offset: target ? -60 : 0 });
          else target ? target.scrollIntoView() : window.scrollTo(0, 0);
          return anim(curtain, [{ transform: 'translateX(0)' }, { transform: 'translateX(110%)' }], { duration: 600, delay: 140, easing: 'cubic-bezier(.65,0,.35,1)' })
            .then(() => { curtain.getAnimations().forEach((a) => a.cancel()); curtain.classList.remove('on'); });
        },
      }],
    });
    barba.hooks.after(({ next }) => {
      initPage(next.container);
      next.container.querySelector('h1')?.focus({ preventScroll: true });
    });
  }
  initPage(document.querySelector('[data-barba="container"]'));
  if (location.hash) setTimeout(() => scrollTo(location.hash, { immediate: true }), 50);
})();
