/* ==========================================================================
   GreenBasket – products.js
   Product catalogue and image URLs are authored in each page HTML file.
   This file contains rendering, cart controls, filtering and product details logic.
   In production, replace GB.getProducts() with a call to your API, e.g.
   fetch('/api/products').then(r => r.json()) – see documentation.
   Prices are in INR (base currency). Images are hot-linked from Unsplash.
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});

  /* Read the editable product catalogue from semantic HTML records. */
  const catalog = document.querySelector('[data-product-catalog]');
  const DEFAULT_PRODUCTS = catalog ? Array.from(catalog.querySelectorAll('[data-id]')).map((node) => {
    const d = node.dataset;
    const image = node.querySelector('img');
    let units = [];
    try { units = JSON.parse(d.units || '[]'); } catch (_) { units = []; }
    return {
      id: d.id, name: d.name, cat: d.cat, brand: d.brand, unit: d.unit,
      price: Number(d.price), oldPrice: d.oldPrice ? Number(d.oldPrice) : null,
      rating: Number(d.rating), reviews: Number(d.reviews), sold: Number(d.sold),
      stock: Number(d.stock), img: image ? image.getAttribute('src') : '',
      imgLg: d.imgLg || (image ? image.getAttribute('src') : ''),
      organic: String(d.organic || '').toLowerCase() === 'true',
      essential: String(d.essential || '').toLowerCase() === 'true',
      isNew: String(d.isNew || '').toLowerCase() === 'true', desc: d.desc,
      units: units.length ? units : [{ label: d.unit, mult: 1 }]
    };
  }) : [];
  GB.defaultProducts = DEFAULT_PRODUCTS;
  /** Admin edits override the HTML-authored demo catalogue. */
  GB.getProducts = () => {
    const custom = GB.store.get('admin-products');
    return Array.isArray(custom) && custom.length ? custom : DEFAULT_PRODUCTS;
  };
  GB.findProduct = (id) => GB.getProducts().find((p) => p.id === id);
  GB.categoryName = (slug) => (GB.categories.find((c) => c.slug === slug) || {}).name || slug;
  GB.discount = (p) => (p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
  GB.stockState = (p) => (p.stock <= 0 ? 'out' : p.stock < 10 ? 'low' : 'in');
  GB.stockLabel = (p) => ({ out: 'Out of stock', low: `Only ${p.stock} left`, in: 'In stock' }[GB.stockState(p)]);
  GB.productUrl = (p) => `${GB.root}product-details.html?id=${encodeURIComponent(p.id)}`;

  GB.stars = (rating) => {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="bi ${rating >= i ? 'bi-star-fill' : rating >= i - 0.5 ? 'bi-star-half' : 'bi-star'}" aria-hidden="true"></i>`;
    }
    return `<span class="rating" role="img" aria-label="Rated ${rating} out of 5">${html}</span>`;
  };

  /* ------------------------------------------------------------------ */
  /* 2. PRODUCT CARD                                                      */
  /* ------------------------------------------------------------------ */
  GB.cartControl = (p) => {
    if (GB.stockState(p) === 'out') return '<button type="button" class="btn btn-light-gb btn-add" disabled>Sold out</button>';
    const line = GB.cart ? GB.cart.find(p.id, p.units[0].label) : null;
    if (line) {
      return `<div class="qty" role="group" aria-label="Quantity of ${GB.escape(p.name)} in cart">
        <button type="button" data-card-qty="-1" data-id="${p.id}" aria-label="Decrease quantity"><i class="bi bi-dash" aria-hidden="true"></i></button>
        <input type="number" value="${line.qty}" min="0" max="99" aria-label="Quantity" data-card-qty-input data-id="${p.id}">
        <button type="button" data-card-qty="1" data-id="${p.id}" aria-label="Increase quantity"><i class="bi bi-plus" aria-hidden="true"></i></button></div>`;
    }
    return `<button type="button" class="btn btn-primary btn-add" data-add-to-cart data-id="${p.id}" aria-label="Add ${GB.escape(p.name)} to cart"><i class="bi bi-cart-plus" aria-hidden="true"></i> Add</button>`;
  };

  GB.productCard = (p) => {
    const off = GB.discount(p);
    const wished = GB.wishlist && GB.wishlist.has(p.id);
    const name = GB.escape(p.name);
    return `<article class="product-card ${GB.stockState(p) === 'out' ? 'stock-out' : ''}" data-product="${p.id}">
      <div class="product-media">
        <div class="product-badges">
          ${off ? `<span class="badge-sale">-${off}%</span>` : ''}
          ${p.organic ? '<span class="badge-tag">Organic</span>' : p.isNew ? '<span class="badge-tag orange">New</span>' : ''}
        </div>
        <div class="product-tools">
          <button type="button" class="tool-btn ${wished ? 'is-active' : ''}" data-wishlist-toggle data-id="${p.id}" aria-pressed="${wished}" aria-label="${wished ? 'Remove' : 'Add'} ${name} ${wished ? 'from' : 'to'} wishlist"><i class="bi ${wished ? 'bi-heart-fill' : 'bi-heart'}" aria-hidden="true"></i></button>
          <button type="button" class="tool-btn" data-quick-view data-id="${p.id}" aria-label="Quick view ${name}"><i class="bi bi-eye" aria-hidden="true"></i></button>
        </div>
        <a href="${GB.productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="${name}" loading="lazy" width="400" height="400"></a>
      </div>
      <div class="product-body">
        <span class="product-cat">${GB.escape(GB.categoryName(p.cat))}</span>
        <h3 class="product-title"><a href="${GB.productUrl(p)}">${name}</a></h3>
        <span class="product-unit">${GB.escape(p.unit)} · <span class="stock-label ${GB.stockState(p)}">${GB.stockLabel(p)}</span></span>
        <div class="rating-row">${GB.stars(p.rating)}<span class="rating-count">(${p.reviews})</span></div>
        <p class="product-desc mb-1">${GB.escape(p.desc)}</p>
        <div class="product-foot">
          <div class="price"><span class="now">${GB.formatPrice(p.price)}</span>${p.oldPrice ? `<del aria-label="Original price">${GB.formatPrice(p.oldPrice)}</del>` : ''}</div>
          <div data-cart-slot="${p.id}">${GB.cartControl(p)}</div>
        </div>
      </div>
    </article>`;
  };

  /** Refresh cart controls + wishlist hearts inside all rendered cards. */
  GB.refreshCards = () => {
    GB.qsa('[data-cart-slot]').forEach((slot) => {
      const p = GB.findProduct(slot.dataset.cartSlot);
      if (p) slot.innerHTML = GB.cartControl(p);
    });
    GB.qsa('[data-wishlist-toggle]').forEach((b) => {
      const on = GB.wishlist && GB.wishlist.has(b.dataset.id);
      const p = GB.findProduct(b.dataset.id);
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (p) b.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${p.name} ${on ? 'from' : 'to'} wishlist`);
      const i = b.querySelector('i');
      if (i) i.className = 'bi ' + (on ? 'bi-heart-fill' : 'bi-heart');
    });
  };

  /* Filter presets used by [data-product-grid="preset"] */
  const PRESETS = {
    deals: (list) => list.filter((p) => GB.discount(p) > 0 && p.stock > 0).sort((a, b) => GB.discount(b) - GB.discount(a)),
    best: (list) => [...list].sort((a, b) => b.sold - a.sold),
    essentials: (list) => list.filter((p) => p.essential),
    organic: (list) => list.filter((p) => p.organic),
    new: (list) => list.filter((p) => p.isNew),
    all: (list) => list
  };

  /** Render every [data-product-grid] container (homepages, related, etc.). */
  function renderGrids() {
    GB.qsa('[data-product-grid]').forEach((grid) => {
      const limit = parseInt(grid.dataset.limit || '8', 10);
      grid.innerHTML = GB.skeletonCards(Math.min(limit, 8));
      grid.setAttribute('aria-busy', 'true');
      // Short delay demonstrates loading skeletons; replace with real fetch latency.
      setTimeout(() => {
        let list = (PRESETS[grid.dataset.productGrid] || PRESETS.all)(GB.getProducts());
        if (grid.dataset.category) list = list.filter((p) => p.cat === grid.dataset.category);
        if (grid.dataset.exclude) list = list.filter((p) => p.id !== grid.dataset.exclude);
        list = list.slice(0, limit);
        grid.innerHTML = list.length ? list.map(GB.productCard).join('') : '<p class="text-center">No products to show yet.</p>';
        grid.setAttribute('aria-busy', 'false');
      }, 350);
    });
    // Category product counts
    GB.qsa('[data-cat-count]').forEach((el) => {
      const n = GB.getProducts().filter((p) => p.cat === el.dataset.catCount).length;
      el.textContent = `${n} product${n === 1 ? '' : 's'}`;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. QUICK VIEW MODAL                                                  */
  /* ------------------------------------------------------------------ */
  function quickView(id) {
    const p = GB.findProduct(id);
    if (!p || !window.bootstrap) { if (p) location.href = GB.productUrl(p); return; }
    let modal = document.getElementById('quickViewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'quickViewModal';
      modal.tabIndex = -1;
      modal.setAttribute('aria-labelledby', 'quickViewTitle');
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = '<div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h5" id="quickViewTitle">Quick view</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"></div></div></div>';
      document.body.appendChild(modal);
    }
    const off = GB.discount(p);
    modal.querySelector('.modal-body').innerHTML = `<div class="row g-4 align-items-center">
      <div class="col-md-6"><img class="quickview-img" src="${p.imgLg}" alt="${GB.escape(p.name)}"></div>
      <div class="col-md-6">
        <span class="product-cat">${GB.escape(GB.categoryName(p.cat))} · ${GB.escape(p.brand)}</span>
        <h3 class="h4 mt-1">${GB.escape(p.name)}</h3>
        <div class="mb-2"><div class="rating-row">${GB.stars(p.rating)}<span class="rating-count">(${p.reviews} reviews)</span></div></div>
        <div class="price mb-2"><span class="now fs-3">${GB.formatPrice(p.price)}</span>${p.oldPrice ? `<del>${GB.formatPrice(p.oldPrice)}</del><span class="off">Save ${off}%</span>` : ''}</div>
        <p class="mb-2">${GB.escape(p.desc)}</p>
        <p class="mb-3"><strong class="text-heading">Unit:</strong> ${GB.escape(p.unit)} · <span class="stock-label ${GB.stockState(p)}">${GB.stockLabel(p)}</span></p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-primary" data-add-to-cart data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}><i class="bi bi-cart-plus" aria-hidden="true"></i> Add to cart</button>
          <a class="btn btn-outline-primary" href="${GB.productUrl(p)}">View details</a>
        </div>
      </div></div>`;
    bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  /* ------------------------------------------------------------------ */
  /* Global click delegation for product cards                            */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-to-cart]');
    if (add && GB.cart) {
      const p = GB.findProduct(add.dataset.id);
      if (!p) return;
      const qty = parseInt(add.dataset.qty || '1', 10);
      GB.cart.add(p.id, qty, add.dataset.unit || p.units[0].label);
      GB.toast(`${p.name} added to cart`, 'success', { text: 'View cart', href: GB.root + 'cart.html' });
      return;
    }
    const step = e.target.closest('[data-card-qty]');
    if (step && GB.cart) {
      const p = GB.findProduct(step.dataset.id);
      const line = GB.cart.find(p.id, p.units[0].label);
      if (line) GB.cart.setQty(line.key, line.qty + parseInt(step.dataset.cardQty, 10));
      return;
    }
    const wish = e.target.closest('[data-wishlist-toggle]');
    if (wish && GB.wishlist) {
      const p = GB.findProduct(wish.dataset.id);
      const added = GB.wishlist.toggle(wish.dataset.id);
      if (p) GB.toast(added ? `${p.name} saved to wishlist` : `${p.name} removed from wishlist`, added ? 'success' : 'info', added ? { text: 'View', href: GB.root + 'wishlist.html' } : null);
      return;
    }
    const qv = e.target.closest('[data-quick-view]');
    if (qv) quickView(qv.dataset.id);
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-card-qty-input]');
    if (input && GB.cart) {
      const p = GB.findProduct(input.dataset.id);
      const line = GB.cart.find(p.id, p.units[0].label);
      if (line) GB.cart.setQty(line.key, Math.max(0, Math.min(99, parseInt(input.value, 10) || 0)));
    }
  });

  /* ------------------------------------------------------------------ */
  /* 4. SHOP PAGE                                                         */
  /* ------------------------------------------------------------------ */
  function initShop() {
    const shop = GB.qs('[data-shop]');
    if (!shop) return;
    const grid = GB.qs('[data-shop-grid]', shop);
    const pager = GB.qs('[data-shop-pager]', shop);
    const countEl = GB.qs('[data-shop-count]', shop);
    const chips = GB.qs('[data-active-filters]', shop);
    const params = new URLSearchParams(location.search);
    const all = GB.getProducts();
    const maxPrice = Math.ceil(Math.max(...all.map((p) => p.price)) / 50) * 50;
    const state = {
      q: params.get('q') || '',
      cat: params.get('cat') || 'all',
      brands: [],
      rating: 0,
      inStock: false,
      dealsOnly: params.get('deals') === '1',
      min: 0,
      max: maxPrice,
      sort: params.get('sort') || 'featured',
      view: GB.store.get('shop-view', 'grid'),
      page: 1,
      perPage: 9
    };

    // Build category list & brand list
    const catList = GB.qs('[data-filter-cats]', shop);
    const categoryData = Array.isArray(GB.categories) ? GB.categories : [];
    if (catList && categoryData.length) {
      catList.innerHTML = [{ slug: 'all', name: 'All products' }, ...categoryData].map((c) => {
        const n = c.slug === 'all' ? all.length : all.filter((p) => p.cat === c.slug).length;
        return `<li><button type="button" data-cat="${GB.escape(c.slug)}"><span>${GB.escape(c.name)}</span><span class="count">${n}</span></button></li>`;
      }).join('');
    }
    const brands = [...new Set(all.map((p) => p.brand))].sort();
    GB.qs('[data-filter-brands]', shop).innerHTML = brands.map((b, i) => `<div class="form-check mb-2"><input class="form-check-input" type="checkbox" value="${GB.escape(b)}" id="brand${i}" data-brand><label class="form-check-label" for="brand${i}">${GB.escape(b)}</label></div>`).join('');

    const searchInput = GB.qs('[data-shop-search]', shop);
    const minI = GB.qs('[data-price-min]', shop), maxI = GB.qs('[data-price-max]', shop), range = GB.qs('[data-price-range]', shop);
    const sortSel = GB.qs('[data-shop-sort]', shop);
    const stockChk = GB.qs('[data-in-stock]', shop), dealChk = GB.qs('[data-deals-only]', shop);
    searchInput.value = state.q;
    range.max = maxPrice; range.value = maxPrice; maxI.value = maxPrice; minI.value = 0;
    sortSel.value = state.sort;
    dealChk.checked = state.dealsOnly;
    // Header search box mirrors the query
    GB.qsa('.header-search input[name="q"]').forEach((i) => { i.value = state.q; });

    const apply = () => {
      const q = state.q.trim().toLowerCase();
      let list = all.filter((p) =>
        (state.cat === 'all' || p.cat === state.cat) &&
        (!q || (p.name + ' ' + p.brand + ' ' + GB.categoryName(p.cat)).toLowerCase().includes(q)) &&
        (!state.brands.length || state.brands.includes(p.brand)) &&
        p.rating >= state.rating &&
        (!state.inStock || p.stock > 0) &&
        (!state.dealsOnly || GB.discount(p) > 0) &&
        p.price >= state.min && p.price <= state.max);
      const sorters = {
        featured: (a, b) => (b.stock > 0) - (a.stock > 0) || b.rating * b.reviews - a.rating * a.reviews,
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        popularity: (a, b) => b.sold - a.sold,
        rating: (a, b) => b.rating - a.rating,
        discount: (a, b) => GB.discount(b) - GB.discount(a),
        name: (a, b) => a.name.localeCompare(b.name)
      };
      list.sort(sorters[state.sort] || sorters.featured);
      const pages = Math.max(1, Math.ceil(list.length / state.perPage));
      state.page = Math.min(state.page, pages);
      const slice = list.slice((state.page - 1) * state.perPage, state.page * state.perPage);

      grid.classList.toggle('list-view', state.view === 'list');
      GB.qsa('[data-view]', shop).forEach((b) => { const on = b.dataset.view === state.view; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
      GB.qsa('[data-cat]', shop).forEach((b) => { const on = b.dataset.cat === state.cat; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
      const title = GB.qs('[data-shop-title]');
      if (title) title.textContent = state.dealsOnly ? 'Deals & Offers' : state.cat === 'all' ? 'All Products' : GB.categoryName(state.cat);

      countEl.textContent = list.length
        ? `Showing ${(state.page - 1) * state.perPage + 1}–${Math.min(state.page * state.perPage, list.length)} of ${list.length} products`
        : 'No products found';

      if (!slice.length) {
        grid.innerHTML = `<div class="empty-state"><div class="ic"><i class="bi bi-search" aria-hidden="true"></i></div>
          <h2>No products match your filters</h2><p>Try a different search word or clear the filters to see everything.</p>
          <button type="button" class="btn btn-primary" data-reset-filters><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Clear all filters</button></div>`;
      } else {
        grid.innerHTML = slice.map(GB.productCard).join('');
      }
      GB.renderPagination(pager, state.page, pages, (p) => { state.page = p; apply(); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

      // Active filter chips
      const c = [];
      if (state.q) c.push(['q', `“${state.q}”`]);
      if (state.cat !== 'all') c.push(['cat', GB.categoryName(state.cat)]);
      state.brands.forEach((b) => c.push(['brand:' + b, b]));
      if (state.rating) c.push(['rating', `${state.rating}★ & up`]);
      if (state.inStock) c.push(['stock', 'In stock']);
      if (state.dealsOnly) c.push(['deals', 'On sale']);
      if (state.min > 0 || state.max < maxPrice) c.push(['price', `${GB.formatPrice(state.min)} – ${GB.formatPrice(state.max)}`]);
      chips.innerHTML = c.map(([k, l]) => `<button type="button" class="chip" data-chip="${GB.escape(k)}" aria-label="Remove filter ${GB.escape(l)}">${GB.escape(l)} <i class="bi bi-x-lg" aria-hidden="true"></i></button>`).join('')
        + (c.length ? '<button type="button" class="btn btn-link btn-sm p-0 ms-1" data-reset-filters>Clear all</button>' : '');
      // Keep URL shareable
      const url = new URL(location.href);
      ['q', 'cat', 'sort', 'deals'].forEach((k) => url.searchParams.delete(k));
      if (state.q) url.searchParams.set('q', state.q);
      if (state.cat !== 'all') url.searchParams.set('cat', state.cat);
      if (state.sort !== 'featured') url.searchParams.set('sort', state.sort);
      if (state.dealsOnly) url.searchParams.set('deals', '1');
      history.replaceState(null, '', url);
    };

    const loadWithSkeleton = () => {
      grid.innerHTML = GB.skeletonCards(6);
      grid.setAttribute('aria-busy', 'true');
      setTimeout(() => { apply(); grid.setAttribute('aria-busy', 'false'); }, 300);
    };
    const reset = () => {
      Object.assign(state, { q: '', cat: 'all', brands: [], rating: 0, inStock: false, dealsOnly: false, min: 0, max: maxPrice, page: 1 });
      searchInput.value = ''; minI.value = 0; maxI.value = maxPrice; range.value = maxPrice;
      GB.qsa('[data-brand]', shop).forEach((b) => { b.checked = false; });
      GB.qsa('[name="rating"]', shop).forEach((r) => { r.checked = r.value === '0'; });
      stockChk.checked = false; dealChk.checked = false;
      apply();
    };

    shop.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { state.cat = cat.dataset.cat; state.page = 1; apply(); }
      const v = e.target.closest('[data-view]');
      if (v) { state.view = v.dataset.view; GB.store.set('shop-view', state.view); apply(); }
      if (e.target.closest('[data-reset-filters]')) reset();
      const chip = e.target.closest('[data-chip]');
      if (chip) {
        const k = chip.dataset.chip;
        if (k === 'q') { state.q = ''; searchInput.value = ''; }
        else if (k === 'cat') state.cat = 'all';
        else if (k.startsWith('brand:')) { state.brands = state.brands.filter((b) => b !== k.slice(6)); GB.qsa('[data-brand]', shop).forEach((b) => { if (b.value === k.slice(6)) b.checked = false; }); }
        else if (k === 'rating') { state.rating = 0; GB.qsa('[name="rating"]', shop).forEach((r) => { r.checked = r.value === '0'; }); }
        else if (k === 'stock') { state.inStock = false; stockChk.checked = false; }
        else if (k === 'deals') { state.dealsOnly = false; dealChk.checked = false; }
        else if (k === 'price') { state.min = 0; state.max = maxPrice; minI.value = 0; maxI.value = maxPrice; range.value = maxPrice; }
        state.page = 1; apply();
      }
    });
    let t;
    searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = searchInput.value; state.page = 1; apply(); }, 250); });
    searchInput.closest('form').addEventListener('submit', (e) => { e.preventDefault(); state.q = searchInput.value; state.page = 1; apply(); });
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; state.page = 1; apply(); });
    shop.addEventListener('change', (e) => {
      if (e.target.matches('[data-brand]')) { state.brands = GB.qsa('[data-brand]:checked', shop).map((b) => b.value); state.page = 1; apply(); }
      if (e.target.name === 'rating') { state.rating = parseFloat(e.target.value); state.page = 1; apply(); }
      if (e.target === stockChk) { state.inStock = stockChk.checked; state.page = 1; apply(); }
      if (e.target === dealChk) { state.dealsOnly = dealChk.checked; state.page = 1; apply(); }
      if (e.target === minI || e.target === maxI) {
        let a = Math.max(0, parseInt(minI.value, 10) || 0), b = Math.min(maxPrice, parseInt(maxI.value, 10) || maxPrice);
        if (a > b) [a, b] = [b, a];
        state.min = a; state.max = b; minI.value = a; maxI.value = b; range.value = b; state.page = 1; apply();
      }
    });
    range.addEventListener('input', () => { maxI.value = range.value; });
    range.addEventListener('change', () => { state.max = parseInt(range.value, 10); if (state.min > state.max) state.min = 0; minI.value = state.min; state.page = 1; apply(); });
    document.addEventListener('gb:currency', apply);
    loadWithSkeleton();
  }

  /* ------------------------------------------------------------------ */
  /* 5. PRODUCT DETAILS PAGE                                              */
  /* ------------------------------------------------------------------ */
  function initDetails() {
    const page = GB.qs('[data-product-details]');
    if (!page) return;
    const id = new URLSearchParams(location.search).get('id') || 'p01';
    const p = GB.findProduct(id) || GB.getProducts()[0];
    let unit = p.units.find((u) => u.label === p.unit) || p.units[0];
    const set = (sel, html) => { const el = GB.qs(sel, page); if (el) el.innerHTML = html; };
    const txt = (sel, t) => { const el = GB.qs(sel, page); if (el) el.textContent = t; };

    document.title = `${p.name} – Buy Online | GreenBasket`;
    const md = GB.qs('meta[name="description"]');
    if (md) md.setAttribute('content', `Buy ${p.name} (${p.unit}) online at GreenBasket. ${p.desc}`);
    txt('[data-pd-name]', p.name);
    txt('[data-pd-crumb]', p.name);
    const crumbCat = GB.qs('[data-pd-crumb-cat]', page);
    if (crumbCat) { crumbCat.textContent = GB.categoryName(p.cat); crumbCat.href = `products.html?cat=${p.cat}`; }
    txt('[data-pd-cat]', `${GB.categoryName(p.cat)} · ${p.brand}`);
    GB.qsa('[data-pd-desc]', page).forEach((el) => { el.textContent = p.desc; });
    set('[data-pd-rating]', `<div class="rating-row">${GB.stars(p.rating)}<span class="rating-count">${p.rating} · <a href="#reviews-tab-pane" data-open-reviews>${p.reviews} reviews</a></span></div>`);

    // Gallery: product photo + its category image (demo). Replace with real product shots.
    const cat = GB.categories.find((c) => c.slug === p.cat);
    const gallery = [p.imgLg, p.imgLg.replace('fit=crop', 'fit=crop&crop=entropy'), cat ? cat.img.replace('w=500', 'w=1000') : p.imgLg, p.imgLg.replace('fit=crop', 'fit=crop&crop=top')];
    const main = GB.qs('[data-pd-main]', page);
    main.src = gallery[0]; main.alt = p.name;
    set('[data-pd-thumbs]', gallery.map((src, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-thumb="${i}" aria-label="Show image ${i + 1} of ${gallery.length}"><img src="${src.replace('w=1000', 'w=200')}" alt=""></button>`).join(''));
    GB.qs('[data-pd-thumbs]', page).addEventListener('click', (e) => {
      const b = e.target.closest('[data-thumb]');
      if (!b) return;
      main.src = gallery[b.dataset.thumb];
      GB.qsa('[data-thumb]', page).forEach((x) => x.classList.toggle('active', x === b));
    });
    set('[data-pd-badges]', `${GB.discount(p) ? `<span class="badge-sale">-${GB.discount(p)}%</span>` : ''}${p.organic ? '<span class="badge-tag">Organic</span>' : ''}`);

    const renderPrice = () => {
      const now = Math.round(p.price * unit.mult), old = p.oldPrice ? Math.round(p.oldPrice * unit.mult) : 0;
      set('[data-pd-price]', `<span class="now">${GB.formatPrice(now)}</span>${old ? `<del>${GB.formatPrice(old)}</del><span class="off">You save ${GB.formatPrice(old - now)} (${GB.discount(p)}%)</span>` : ''}`);
    };
    set('[data-pd-units]', p.units.map((u, i) => `<input type="radio" name="unit" id="unit${i}" value="${GB.escape(u.label)}" ${u === unit ? 'checked' : ''}><label for="unit${i}">${GB.escape(u.label)}</label>`).join(''));
    GB.qs('[data-pd-units]', page).addEventListener('change', (e) => { unit = p.units.find((u) => u.label === e.target.value) || unit; renderPrice(); });
    renderPrice();
    document.addEventListener('gb:currency', renderPrice);

    const st = GB.stockState(p);
    set('[data-pd-stock]', `<span class="stock-label ${st}"><i class="bi ${st === 'out' ? 'bi-x-circle' : st === 'low' ? 'bi-exclamation-circle' : 'bi-check-circle'}" aria-hidden="true"></i> ${GB.stockLabel(p)}</span>`);
    const qtyInput = GB.qs('[data-pd-qty]', page);
    GB.qsa('[data-pd-step]', page).forEach((b) => b.addEventListener('click', () => {
      qtyInput.value = Math.max(1, Math.min(Math.max(1, Math.min(p.stock, 20)), (parseInt(qtyInput.value, 10) || 1) + parseInt(b.dataset.pdStep, 10)));
    }));
    const addBtn = GB.qs('[data-pd-add]', page), buyBtn = GB.qs('[data-pd-buy]', page);
    if (st === 'out') { addBtn.disabled = true; buyBtn.disabled = true; addBtn.textContent = 'Out of stock'; }
    const addCurrent = () => {
      const q = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      GB.cart.add(p.id, q, unit.label);
      return q;
    };
    addBtn.addEventListener('click', () => { const q = addCurrent(); GB.toast(`${q} × ${p.name} (${unit.label}) added to cart`, 'success', { text: 'View cart', href: 'cart.html' }); });
    buyBtn.addEventListener('click', () => { addCurrent(); location.href = 'checkout.html'; });
    const wishBtn = GB.qs('[data-pd-wish]', page);
    wishBtn.dataset.id = p.id;
    wishBtn.setAttribute('data-wishlist-toggle', '');
    GB.refreshCards();

    // Information table
    set('[data-pd-info]', [
      ['Brand', p.brand], ['Category', GB.categoryName(p.cat)], ['Pack size', p.unit], ['SKU', 'GB-' + p.id.toUpperCase() + '-01'],
      ['Shelf life', p.cat === 'household' ? '24 months' : p.cat === 'rice-grains' || p.cat === 'snacks' ? '6–12 months' : '2–7 days (refrigerate)'],
      ['Country of origin', p.id === 'p16' || p.id === 'p37' ? 'Imported' : 'India'], ['Type', p.organic ? 'Certified organic' : 'Conventional']
    ].map(([k, v]) => `<li><span>${k}</span><span>${GB.escape(v)}</span></li>`).join(''));
    txt('[data-pd-review-count]', p.reviews);
    txt('[data-pd-review-avg]', p.rating.toFixed(1));

    // Reviews link opens the reviews tab
    page.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-reviews]') && window.bootstrap) {
        e.preventDefault();
        const tab = document.getElementById('reviews-tab');
        if (tab) { bootstrap.Tab.getOrCreateInstance(tab).show(); tab.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    });

    // Related products use the same category
    const related = GB.qs('[data-product-grid][data-related]');
    if (related) { related.dataset.category = p.cat; related.dataset.exclude = p.id; }

    // Product structured data (JSON-LD) – update offers when connected to live inventory
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: [p.imgLg], description: p.desc, sku: 'GB-' + p.id.toUpperCase(),
      brand: { '@type': 'Brand', name: p.brand },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: location.href }
    });
    document.head.appendChild(ld);
  }

  GB.renderGrids = renderGrids;

  document.addEventListener('DOMContentLoaded', () => {
    initDetails();      // must run before renderGrids so related grid knows its category
    renderGrids();
    initShop();
    document.addEventListener('gb:cart', GB.refreshCards);
    document.addEventListener('gb:wishlist', GB.refreshCards);
    document.addEventListener('gb:currency', () => {
      GB.qsa('[data-product-grid]').forEach((g) => {
        // re-render grids so prices use the new currency (no skeleton)
        const cards = GB.qsa('[data-product]', g).map((c) => GB.findProduct(c.dataset.product)).filter(Boolean);
        if (cards.length) g.innerHTML = cards.map(GB.productCard).join('');
      });
    });
  });
})();
