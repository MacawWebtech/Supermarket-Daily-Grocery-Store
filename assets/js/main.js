/* ==========================================================================
   GreenBasket – main.js
   Core helpers shared by every page (storefront, customer area, admin):
   - GB namespace: storage, price formatting, toasts, escaping
   - Theme switching (light / dark, OS preference, persisted)
   - RTL switching (swaps Bootstrap LTR/RTL stylesheet, persisted)
   - Currency selector, header behaviour, back-to-top, badges
   - Countdown timers, animated counters, image fallbacks, blog filters
   NOTE: All "data" in this template lives in the browser (localStorage).
         Nothing is sent to a server. See documentation/index.html → Backend.
   ========================================================================== */
(function () {
  'use strict';

  const GB = (window.GB = window.GB || {});
  const PREFIX = 'gb-';

  /* ---------- DOM helpers --------------------------------------------- */
  GB.qs = (sel, ctx = document) => ctx.querySelector(sel);
  GB.qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  GB.root = (document.body && document.body.dataset.root) || '';
  GB.escape = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- localStorage wrapper (safe in private mode) -------------- */
  GB.store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
    },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } }
  };

  /* ---------- Currency & price formatting ------------------------------ */
  // Catalogue prices are stored in INR. Rates below are DEMO values only –
  // connect a live rates API in production (see documentation).
  GB.currencies = {
    INR: { symbol: '₹', rate: 1, locale: 'en-IN', decimals: 0 },
    USD: { symbol: '$', rate: 0.012, locale: 'en-US', decimals: 2 },
    EUR: { symbol: '€', rate: 0.011, locale: 'de-DE', decimals: 2 },
    AED: { symbol: 'AED ', rate: 0.044, locale: 'en-AE', decimals: 2 }
  };
  GB.currency = () => GB.store.get('currency', 'INR');
  GB.formatPrice = (inr) => {
    const c = GB.currencies[GB.currency()] || GB.currencies.INR;
    const v = (Number(inr) || 0) * c.rate;
    return c.symbol + v.toLocaleString(c.locale, { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  };
  GB.refreshStaticPrices = () => {
    GB.qsa('[data-price]').forEach((el) => { el.textContent = GB.formatPrice(el.dataset.price); });
  };

  /* ---------- Toast notifications -------------------------------------- */
  GB.toast = (message, type = 'success', action) => {
    let stack = GB.qs('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
    const t = document.createElement('div');
    t.className = 'gb-toast ' + type;
    t.innerHTML = `<i class="bi ${icons[type] || icons.info} lead-ic" aria-hidden="true"></i>
      <span class="msg">${GB.escape(message)}</span>
      ${action ? `<a href="${GB.escape(action.href)}">${GB.escape(action.text)}</a>` : ''}
      <button type="button" aria-label="Dismiss notification"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`;
    const close = () => { t.classList.add('hide'); setTimeout(() => t.remove(), 260); };
    t.querySelector('button').addEventListener('click', close);
    stack.appendChild(t);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    setTimeout(close, 4200);
  };

  /* ---------- Theme (light / dark) ------------------------------------- */
  GB.getTheme = () => GB.store.get('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  GB.setTheme = (theme, persist = true) => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (persist) GB.store.set('theme', theme);
    GB.qsa('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    document.dispatchEvent(new CustomEvent('gb:theme', { detail: theme }));
  };

  /* ---------- Direction (LTR / RTL) ------------------------------------ */
  GB.setDir = (dir, lang) => {
    const html = document.documentElement;
    html.setAttribute('dir', dir);
    html.setAttribute('lang', lang || (dir === 'rtl' ? 'ar' : 'en'));
    const link = document.getElementById('bootstrap-css');
    if (link && link.dataset.rtl && link.dataset.ltr) link.href = dir === 'rtl' ? link.dataset.rtl : link.dataset.ltr;
    GB.store.set('dir', dir);
    GB.store.set('lang', html.getAttribute('lang'));
    GB.qsa('[data-lang-select]').forEach((s) => { s.value = html.getAttribute('lang'); });
    GB.qsa('[data-rtl-toggle]').forEach((b) => b.setAttribute('aria-pressed', dir === 'rtl' ? 'true' : 'false'));
  };

  /* ---------- Header badges (cart / wishlist) -------------------------- */
  GB.updateBadges = (bump) => {
    const cartCount = GB.cart ? GB.cart.count() : 0;
    const wishCount = GB.wishlist ? GB.wishlist.ids().length : 0;
    GB.qsa('[data-cart-count]').forEach((el) => {
      el.textContent = cartCount;
      el.hidden = cartCount === 0;
      if (bump === 'cart') { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    GB.qsa('[data-wishlist-count]').forEach((el) => { el.textContent = wishCount; el.hidden = wishCount === 0; });
    GB.qsa('[data-cart-total]').forEach((el) => { el.textContent = GB.cart ? GB.formatPrice(GB.cart.totals().subtotal) : GB.formatPrice(0); });
  };

  /* ---------- Skeleton loader markup ----------------------------------- */
  GB.skeletonCards = (n) => Array.from({ length: n }, () =>
    '<div class="skeleton-card" aria-hidden="true"><div class="skeleton sk-img"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line w60"></div><div class="skeleton sk-line w40"></div></div>').join('');

  /* ---------- Placeholder for images that fail to load ----------------- */
  const PLACEHOLDER = GB.root + 'assets/images/placeholder.svg';
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = PLACEHOLDER;
    }
  }, true);

  /* ---------- Counters (stats sections) -------------------------------- */
  function initCounters() {
    const els = GB.qsa('[data-counter]');
    if (!els.length) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = (el) => {
      const target = parseFloat(el.dataset.counter);
      const suffix = el.dataset.suffix || '';
      if (reduce) { el.textContent = target.toLocaleString() + suffix; return; }
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1400, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: .4 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Countdown ([data-countdown="ISO date"]) ------------------ */
  function initCountdowns() {
    GB.qsa('[data-countdown]').forEach((box) => {
      let end = new Date(box.dataset.countdown).getTime();
      // If the launch date has passed (template demo), roll forward so the timer still works.
      if (!end || end < Date.now()) end = Date.now() + (parseInt(box.dataset.fallbackDays || '12', 10) * 864e5);
      const set = (unit, v) => { const el = box.querySelector(`[data-unit="${unit}"]`); if (el) el.textContent = String(v).padStart(2, '0'); };
      const tick = () => {
        const d = Math.max(0, end - Date.now());
        set('days', Math.floor(d / 864e5));
        set('hours', Math.floor(d / 36e5) % 24);
        set('minutes', Math.floor(d / 6e4) % 60);
        set('seconds', Math.floor(d / 1e3) % 60);
      };
      tick();
      setInterval(tick, 1000);
    });
  }

  /* ---------- Blog listing: search + category filter + pagination ------- */
  function initBlogList() {
    const list = GB.qs('[data-blog-list]');
    if (!list) return;
    const cards = GB.qsa('[data-blog-item]', list);
    const search = GB.qs('[data-blog-search]');
    const pager = GB.qs('[data-blog-pager]');
    const empty = GB.qs('[data-blog-empty]');
    const perPage = 6;
    let cat = 'all', page = 1;
    const params = new URLSearchParams(location.search);
    if (params.get('category')) cat = params.get('category');
    if (params.get('q') && search) search.value = params.get('q');
    const render = () => {
      const q = (search ? search.value : '').trim().toLowerCase();
      const matches = cards.filter((c) => (cat === 'all' || c.dataset.category === cat) && (!q || c.textContent.toLowerCase().includes(q)));
      const pages = Math.max(1, Math.ceil(matches.length / perPage));
      page = Math.min(page, pages);
      cards.forEach((c) => { c.hidden = true; });
      matches.slice((page - 1) * perPage, page * perPage).forEach((c) => { c.hidden = false; });
      if (empty) empty.hidden = matches.length > 0;
      GB.qsa('[data-blog-filter]').forEach((b) => {
        const on = b.dataset.blogFilter === cat;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (pager) GB.renderPagination(pager, page, pages, (p) => { page = p; render(); list.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    };
    GB.qsa('[data-blog-filter]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.blogFilter; page = 1; render(); }));
    if (search) {
      search.addEventListener('input', () => { page = 1; render(); });
      const f = search.closest('form');
      if (f) f.addEventListener('submit', (e) => { e.preventDefault(); page = 1; render(); });
    }
    render();
  }

  /* ---------- Shared pagination renderer ------------------------------- */
  GB.renderPagination = (nav, page, pages, onChange) => {
    if (pages <= 1) { nav.innerHTML = ''; return; }
    let html = '<ul class="pagination justify-content-center flex-wrap">';
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}"><button type="button" class="page-link" data-page="${page - 1}" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></button></li>`;
    for (let i = 1; i <= pages; i++) {
      html += `<li class="page-item ${i === page ? 'active' : ''}"><button type="button" class="page-link" data-page="${i}" ${i === page ? 'aria-current="page"' : ''} aria-label="Page ${i}">${i}</button></li>`;
    }
    html += `<li class="page-item ${page === pages ? 'disabled' : ''}"><button type="button" class="page-link" data-page="${page + 1}" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></button></li></ul>`;
    nav.innerHTML = html;
    GB.qsa('[data-page]', nav).forEach((b) => b.addEventListener('click', () => {
      const p = parseInt(b.dataset.page, 10);
      if (p >= 1 && p <= pages && p !== page) onChange(p);
    }));
  };

  /* ---------- Misc UI --------------------------------------------------- */
  function initHeader() {
    const header = GB.qs('.site-header');
    const btt = GB.qs('.back-to-top');
    const onScroll = () => {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 10);
      if (btt) btt.classList.toggle('show', y > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  }

  function initDemoActions() {
    // Buttons that stand in for features needing a backend/3rd-party service.
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-demo-message]');
      if (b) { e.preventDefault(); GB.toast(b.dataset.demoMessage, 'info'); }
      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const text = copy.dataset.copy === 'url' ? location.href : copy.dataset.copy;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
          .then(() => GB.toast('Copied to clipboard'))
          .catch(() => GB.toast('Copy failed – please copy manually', 'error'));
      }
      const pr = e.target.closest('[data-print]');
      if (pr) window.print();
    });
    // Social share links get the current URL
    GB.qsa('[data-share]').forEach((a) => {
      const u = encodeURIComponent(location.href);
      const t = encodeURIComponent(document.title);
      const map = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
        whatsapp: `https://wa.me/?text=${t}%20${u}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
      };
      if (map[a.dataset.share]) a.href = map[a.dataset.share];
    });
  }

  function initPreferences() {
    // Theme toggles
    GB.setTheme(GB.getTheme(), false);
    GB.qsa('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
      GB.setTheme(document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    }));
    // Follow OS changes if the user never picked a theme explicitly
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
        if (!GB.store.get('theme')) GB.setTheme(ev.matches ? 'dark' : 'light', false);
      });
    }
    // Language select (EN / AR / HE) → direction
    GB.qsa('[data-lang-select]').forEach((s) => {
      s.value = document.documentElement.getAttribute('lang') || 'en';
      s.addEventListener('change', () => {
        const rtl = ['ar', 'he'].includes(s.value);
        GB.setDir(rtl ? 'rtl' : 'ltr', s.value);
        GB.toast(rtl ? 'RTL demo enabled – layout mirrored. Translate text in the HTML files.' : 'Left-to-right layout restored', 'info');
      });
    });
    // Simple RTL toggle buttons (admin / docs)
    GB.qsa('[data-rtl-toggle]').forEach((b) => b.addEventListener('click', () => {
      const rtl = document.documentElement.getAttribute('dir') !== 'rtl';
      GB.setDir(rtl ? 'rtl' : 'ltr', rtl ? 'ar' : 'en');
    }));
    GB.qsa('[data-rtl-toggle]').forEach((b) => b.setAttribute('aria-pressed', document.documentElement.getAttribute('dir') === 'rtl' ? 'true' : 'false'));
    // Currency select
    GB.qsa('[data-currency-select]').forEach((s) => {
      s.value = GB.currency();
      s.addEventListener('change', () => {
        GB.store.set('currency', s.value);
        GB.qsa('[data-currency-select]').forEach((o) => { o.value = s.value; });
        GB.refreshStaticPrices();
        document.dispatchEvent(new CustomEvent('gb:currency', { detail: s.value }));
        GB.updateBadges();
      });
    });
  }

  function initYear() { GB.qsa('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); }); }

  document.addEventListener('DOMContentLoaded', () => {
    initPreferences();
    initHeader();
    initCounters();
    initCountdowns();
    initBlogList();
    initDemoActions();
    initYear();
    GB.refreshStaticPrices();
    GB.updateBadges();
    // Bootstrap tooltips (optional, only if Bootstrap JS loaded)
    if (window.bootstrap) GB.qsa('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
  });
})();
