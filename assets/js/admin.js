/* ==========================================================================
   GreenBasket – admin.js
   Admin panel demo: dashboard charts (Chart.js), products CRUD, categories,
   orders (status updates), customers, delivery, messages, reports (CSV),
   settings. Data is sample data + edits saved in localStorage ("gb-admin-*").
   ⚠ Admin login, permissions and every change here MUST be enforced by a
   backend in production. This file only demonstrates the interface.
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});
  const $ = GB.qs, $$ = GB.qsa;
  const page = document.body.dataset.page || '';

  /* ---------- Sample data ------------------------------------------------ */
  const CUSTOMERS = [
    ['C1001', 'Priya Sharma', 'priya.sharma@example.com', '98765 43210', 'Bengaluru', 24, 18640, 'Active', '1494790108377-be9c29b29330'],
    ['C1002', 'Rahul Verma', 'rahul.verma@example.com', '98450 11223', 'Pune', 17, 12210, 'Active', '1507003211169-0a1dd7228f2d'],
    ['C1003', 'Ananya Iyer', 'ananya.iyer@example.com', '99001 22334', 'Chennai', 31, 26480, 'Active', '1438761681033-6461ffad8d80'],
    ['C1004', 'Mohammed Aziz', 'm.aziz@example.com', '98111 99887', 'Hyderabad', 9, 6120, 'Active', '1500648767791-00dcc994a43e'],
    ['C1005', 'Sneha Kapoor', 'sneha.k@example.com', '97000 45612', 'Mumbai', 12, 9870, 'Active', '1534528741775-53994a69daeb'],
    ['C1006', 'Arjun Mehta', 'arjun.mehta@example.com', '98200 77441', 'Delhi', 4, 2140, 'Inactive', '1506794778202-cad84cf45f1d'],
    ['C1007', 'Fatima Khan', 'fatima.khan@example.com', '99887 66554', 'Lucknow', 21, 15730, 'Active', '1573246123716-6b1782bfc499'],
    ['C1008', 'Vikram Singh', 'vikram.s@example.com', '90080 12345', 'Jaipur', 2, 860, 'Blocked', '1472099645785-5658abf4ff4e']
  ].map(([id, name, email, phone, city, orders, spent, status, img]) => ({ id, name, email, phone, city, orders, spent, status, img: GB.img(img, 120) }));

  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
  const ORDER_SEED = [
    ['GB10491', 'C1003', 0, 1, 1240, 'upi', 'Paid', 'Unassigned'], ['GB10489', 'C1001', 0, 2, 865, 'cod', 'Pending', 'Ravi K.'],
    ['GB10486', 'C1005', 0, 3, 2310, 'card', 'Paid', 'Suresh P.'], ['GB10482', 'C1001', 0, 4, 742, 'upi', 'Paid', 'Ravi K.'],
    ['GB10478', 'C1002', 1, 4, 1590, 'online', 'Paid', 'Imran S.'], ['GB10470', 'C1007', 1, 5, 3120, 'card', 'Paid', 'Suresh P.'],
    ['GB10466', 'C1004', 2, 5, 640, 'cod', 'Paid', 'Ravi K.'], ['GB10457', 'C1001', 3, 5, 1873, 'card', 'Paid', 'Imran S.'],
    ['GB10449', 'C1006', 3, 0, 920, 'upi', 'Refunded', '—'], ['GB10441', 'C1003', 4, 5, 2780, 'upi', 'Paid', 'Ravi K.'],
    ['GB10431', 'C1001', 6, 5, 1305, 'cod', 'Paid', 'Suresh P.'], ['GB10422', 'C1005', 7, 5, 1660, 'card', 'Paid', 'Imran S.']
  ];
  const STATUS = ['Cancelled', 'Placed', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered'];
  const statusClass = (s) => ['status-danger', 'status-warning', 'status-info', 'status-info', 'status-info', 'status-success'][s];
  const payClass = (p) => (/paid/i.test(p) ? 'status-success' : /refund/i.test(p) ? 'status-muted' : 'status-warning');

  const getOrders = () => {
    let o = GB.store.get('admin-orders');
    if (!Array.isArray(o)) {
      o = ORDER_SEED.map(([id, cid, d, status, total, payment, pay, driver]) => ({ id, customer: cid, date: daysAgo(d), status, total, payment, paymentStatus: pay, driver }));
      GB.store.set('admin-orders', o);
    }
    // Include storefront demo orders placed in this browser
    const local = (GB.store.get('orders', []) || []).filter((x) => !o.find((y) => y.id === x.id)).map((x) => ({ id: x.id, customer: x.customer.name, date: x.date, status: x.status, total: x.totals.total, payment: x.payment, paymentStatus: x.payment === 'cod' ? 'Pending' : 'Demo', driver: 'Unassigned', local: true }));
    return [...local, ...o];
  };
  const saveOrder = (order) => {
    if (order.local) {
      const ls = GB.store.get('orders', []);
      const l = ls.find((x) => x.id === order.id);
      if (l) { l.status = order.status; GB.store.set('orders', ls); }
      return;
    }
    const all = GB.store.get('admin-orders', []);
    const i = all.findIndex((x) => x.id === order.id);
    if (i > -1) { all[i] = order; GB.store.set('admin-orders', all); }
  };
  const customerName = (cid) => (CUSTOMERS.find((c) => c.id === cid) || { name: cid }).name;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const badge = (cls, text) => `<span class="status-badge ${cls}">${GB.escape(text)}</span>`;

  /* ---------- Layout: sidebar toggle, auth hint -------------------------- */
  function initLayout() {
    const sb = $('.admin-sidebar');
    const backdrop = $('.admin-backdrop');
    const toggle = (open) => {
      if (!sb) return;
      sb.classList.toggle('open', open);
      if (backdrop) backdrop.classList.toggle('show', open);
      $$('[data-sidebar-toggle]').forEach((b) => b.setAttribute('aria-expanded', open ? 'true' : 'false'));
    };
    $$('[data-sidebar-toggle]').forEach((b) => b.addEventListener('click', () => toggle(!sb.classList.contains('open'))));
    if (backdrop) backdrop.addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    $$('[data-admin-logout]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); GB.store.remove('admin'); location.href = 'login.html'; }));
    const adm = GB.store.get('admin');
    $$('[data-admin-email]').forEach((el) => { el.textContent = adm ? adm.email : 'admin@greenbasket.demo'; });
  }

  /* ---------- Charts ----------------------------------------------------- */
  const charts = [];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function chartTheme() {
    if (!window.Chart) return;
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.color = css('--gb-text');
    Chart.defaults.borderColor = css('--gb-border');
  }
  function makeChart(id, cfg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!window.Chart) { el.parentElement.innerHTML = '<p class="small text-center py-5 mb-0">Chart.js could not be loaded (offline?). Charts appear when the CDN is reachable.</p>'; return; }
    charts.push({ id, cfg, chart: new Chart(el, cfg()) });
  }
  document.addEventListener('gb:theme', () => {
    chartTheme();
    charts.forEach((c) => { c.chart.destroy(); c.chart = new Chart(document.getElementById(c.id), c.cfg()); });
  });

  const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const REVENUE = [412, 398, 436, 471, 455, 502, 538, 561, 549, 590, 624, 668]; // ₹ thousands
  const ORDERS_M = [1180, 1122, 1240, 1315, 1290, 1402, 1488, 1530, 1512, 1604, 1688, 1792];
  const CAT_SHARE = [28, 16, 12, 10, 9, 8, 11, 6];
  const palette = () => [css('--gb-primary'), '#111111', '#7a7a7a', '#a8a8a8', '#4d4d4d', '#cfcfcf', '#1f7a38', '#8fd1a0'];

  function initDashboard() {
    if (page !== 'admin-dashboard' && page !== 'admin-reports') return;
    chartTheme();
    const orders = getOrders();
    const set = (k, v) => $$(`[data-kpi="${k}"]`).forEach((el) => { el.textContent = v; });
    set('revenue', GB.formatPrice(6209000));
    set('orders', (18163 + orders.filter((o) => o.local).length).toLocaleString('en-IN'));
    set('customers', '4,826');
    set('products', GB.getProducts().length);
    set('pending', orders.filter((o) => o.status > 0 && o.status < 5).length);
    set('completed', orders.filter((o) => o.status === 5).length);

    makeChart('revenueChart', () => ({
      type: 'line',
      data: { labels: MONTHS, datasets: [{ label: 'Revenue (₹ thousand)', data: REVENUE, borderColor: css('--gb-primary'), backgroundColor: 'rgba(33,136,56,.12)', fill: true, tension: .35, pointRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, ticks: { callback: (v) => '₹' + v + 'k' } } } }
    }));
    makeChart('ordersChart', () => ({
      type: 'bar',
      data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [
        { label: 'Delivered', data: [212, 198, 225, 240, 268, 312, 290], backgroundColor: css('--gb-primary'), borderRadius: 6 },
        { label: 'Cancelled', data: [6, 4, 7, 5, 8, 9, 6], backgroundColor: '#111111', borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true } } }
    }));
    makeChart('salesChart', () => ({
      type: 'bar',
      data: { labels: MONTHS, datasets: [{ label: 'Orders', data: ORDERS_M, backgroundColor: 'rgba(244,166,42,.85)', borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }
    }));
    makeChart('categoryChart', () => ({
      type: 'doughnut',
      data: { labels: GB.categories.map((c) => c.name), datasets: [{ data: CAT_SHARE, backgroundColor: palette(), borderColor: css('--gb-surface'), borderWidth: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } } }
    }));

    const recent = $('[data-admin-recent]');
    if (recent) recent.innerHTML = orders.slice(0, 6).map((o) => `<tr><td data-label="Order"><a href="orders.html" class="fw-semibold">#${o.id}</a></td><td data-label="Customer">${GB.escape(customerName(o.customer))}</td><td data-label="Date">${fmtDate(o.date)}</td><td data-label="Amount">${GB.formatPrice(o.total)}</td><td data-label="Status">${badge(statusClass(o.status), STATUS[o.status])}</td></tr>`).join('');
    const low = $('[data-low-stock]');
    if (low) low.innerHTML = GB.getProducts().filter((p) => p.stock < 10).sort((a, b) => a.stock - b.stock).slice(0, 6).map((p) => `<li class="d-flex align-items-center gap-3 py-2 border-bottom"><img src="${p.img}" alt="" width="40" height="40" class="rounded"><div class="flex-grow-1"><div class="fw-semibold text-heading small">${GB.escape(p.name)}</div><small>${GB.escape(p.unit)}</small></div>${badge(p.stock <= 0 ? 'status-danger' : 'status-warning', p.stock <= 0 ? 'Out' : p.stock + ' left')}</li>`).join('');
    const top = $('[data-top-products]');
    if (top) top.innerHTML = [...GB.getProducts()].sort((a, b) => b.sold - a.sold).slice(0, 8).map((p, i) => `<tr><td data-label="#">${i + 1}</td><td data-label="Product"><div class="prod-cell"><img src="${p.img}" alt="" width="44" height="44"><span class="fw-semibold text-heading">${GB.escape(p.name)}</span></div></td><td data-label="Category">${GB.escape(GB.categoryName(p.cat))}</td><td data-label="Units sold">${p.sold.toLocaleString('en-IN')}</td><td data-label="Revenue">${GB.formatPrice(p.sold * p.price)}</td></tr>`).join('');
  }

  /* ---------- Generic modal helper -------------------------------------- */
  const modal = (id) => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
  let pendingDelete = null;
  function confirmDelete(text, fn) {
    const el = document.getElementById('confirmModal');
    if (!el || !window.bootstrap) { if (confirm(text)) fn(); return; }
    el.querySelector('[data-confirm-text]').textContent = text;
    pendingDelete = fn;
    modal('confirmModal').show();
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-confirm-yes]') && pendingDelete) { pendingDelete(); pendingDelete = null; modal('confirmModal').hide(); }
  });

  /* ---------- Products CRUD ---------------------------------------------- */
  function initProducts() {
    if (page !== 'admin-products') return;
    const tbody = $('[data-admin-products]');
    const search = $('[data-admin-search]');
    const catSel = $('[data-admin-cat]');
    const stockSel = $('[data-admin-stock]');
    const form = $('[data-product-form]');
    const pager = $('[data-admin-pager]');
    let editing = null, pageNo = 1;
    catSel.insertAdjacentHTML('beforeend', GB.categories.map((c) => `<option value="${c.slug}">${GB.escape(c.name)}</option>`).join(''));
    form.elements.cat.innerHTML = '<option value="">Select category</option>' + GB.categories.map((c) => `<option value="${c.slug}">${GB.escape(c.name)}</option>`).join('');
    const list = () => GB.getProducts().map((p) => ({ ...p }));
    const save = (arr) => { GB.store.set('admin-products', arr); };
    const render = () => {
      const q = search.value.trim().toLowerCase(), c = catSel.value, s = stockSel.value;
      const rows = list().filter((p) => (!q || (p.name + p.brand + p.id).toLowerCase().includes(q)) && (!c || p.cat === c) && (!s || GB.stockState(p) === s));
      const pages = Math.max(1, Math.ceil(rows.length / 10));
      pageNo = Math.min(pageNo, pages);
      $('[data-admin-count]').textContent = `${rows.length} products`;
      tbody.innerHTML = rows.slice((pageNo - 1) * 10, pageNo * 10).map((p) => `<tr data-id="${p.id}">
        <td data-label="Product"><div class="prod-cell"><img src="${p.img}" alt="" width="44" height="44"><div><span class="fw-semibold text-heading d-block">${GB.escape(p.name)}</span><small>${GB.escape(p.brand)} · ${p.id.toUpperCase()}</small></div></div></td>
        <td data-label="Category">${GB.escape(GB.categoryName(p.cat))}</td>
        <td data-label="Unit">${GB.escape(p.unit)}</td>
        <td data-label="Price"><strong class="text-heading">${GB.formatPrice(p.price)}</strong>${p.oldPrice ? `<del class="small ms-1">${GB.formatPrice(p.oldPrice)}</del>` : ''}</td>
        <td data-label="Stock">${badge(p.stock <= 0 ? 'status-danger' : p.stock < 10 ? 'status-warning' : 'status-success', p.stock <= 0 ? 'Out of stock' : p.stock + ' in stock')}</td>
        <td data-label="Actions" class="text-lg-end"><div class="d-inline-flex gap-1">
          <a class="btn btn-sm btn-light-gb btn-icon" href="../product-details.html?id=${p.id}" aria-label="View ${GB.escape(p.name)} in store"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>
          <button type="button" class="btn btn-sm btn-light-gb btn-icon" data-edit aria-label="Edit ${GB.escape(p.name)}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
          <button type="button" class="btn btn-sm btn-light-gb btn-icon text-sale" data-delete aria-label="Delete ${GB.escape(p.name)}"><i class="bi bi-trash3" aria-hidden="true"></i></button></div></td></tr>`).join('')
        || '<tr><td colspan="6" class="text-center py-5">No products match your filters.</td></tr>';
      GB.renderPagination(pager, pageNo, pages, (p) => { pageNo = p; render(); });
    };
    [search, catSel, stockSel].forEach((el) => el.addEventListener('input', () => { pageNo = 1; render(); }));
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-add-product]')) { editing = null; form.reset(); $('#productModalTitle').textContent = 'Add product'; modal('productModal').show(); }
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      const p = list().find((x) => x.id === row.dataset.id);
      if (e.target.closest('[data-edit]')) {
        editing = p.id; form.reset();
        ['name', 'brand', 'cat', 'unit', 'price', 'oldPrice', 'stock', 'desc'].forEach((k) => { form.elements[k].value = p[k] ?? ''; });
        form.elements.img.value = /^https?:/.test(p.img) && !p.img.includes('images.unsplash.com') ? p.img : '';
        form.elements.organic.checked = !!p.organic;
        $('#productModalTitle').textContent = 'Edit product'; modal('productModal').show();
      }
      if (e.target.closest('[data-delete]')) confirmDelete(`Delete “${p.name}”? This removes it from the demo store.`, () => { save(list().filter((x) => x.id !== p.id)); render(); GB.toast('Product deleted', 'info'); });
    });
    form.addEventListener('gb:valid', () => {
      const all = list();
      const f = form.elements;
      const data = { name: f.name.value.trim(), brand: f.brand.value.trim(), cat: f.cat.value, unit: f.unit.value.trim(), price: Number(f.price.value), oldPrice: f.oldPrice.value ? Number(f.oldPrice.value) : null, stock: Number(f.stock.value), desc: f.desc.value.trim(), organic: f.organic.checked };
      if (f.img.value.trim()) { data.img = f.img.value.trim(); data.imgLg = data.img; }
      if (editing) {
        const p = all.find((x) => x.id === editing);
        Object.assign(p, data);
        if (!p.units || p.units.length === 1) p.units = [{ label: data.unit, mult: 1 }];
      } else {
        all.unshift({ id: 'p' + Date.now().toString().slice(-6), rating: 0, reviews: 0, sold: 0, essential: false, isNew: true, img: data.img || GB.root + 'assets/images/placeholder.svg', imgLg: data.img || GB.root + 'assets/images/placeholder.svg', units: [{ label: data.unit, mult: 1 }], ...data });
      }
      save(all); render(); modal('productModal').hide();
      GB.toast(editing ? 'Product updated' : 'Product added – it now appears in the shop (this browser only)');
    });
    $('[data-reset-catalog]').addEventListener('click', () => confirmDelete('Restore the original demo catalogue? Your product edits will be lost.', () => { GB.store.remove('admin-products'); render(); GB.toast('Demo catalogue restored'); }));
    render();
  }

  /* ---------- Categories ------------------------------------------------- */
  function initCategories() {
    if (page !== 'admin-categories') return;
    const grid = $('[data-admin-categories]');
    const form = $('[data-category-form]');
    let editing = null;
    const get = () => {
      let c = GB.store.get('admin-categories');
      if (!Array.isArray(c)) { c = GB.categories.map((x) => ({ slug: x.slug, name: x.name, icon: x.icon, img: x.img, status: 'Active' })); GB.store.set('admin-categories', c); }
      return c;
    };
    const render = () => {
      const prods = GB.getProducts();
      grid.innerHTML = get().map((c) => `<div class="col-sm-6 col-xl-3"><div class="card-gb h-100 p-0 overflow-hidden" data-slug="${c.slug}">
        <img src="${c.img}" alt="" class="w-100" style="aspect-ratio:16/9;object-fit:cover">
        <div class="p-3"><div class="d-flex justify-content-between align-items-start gap-2"><h2 class="h6 mb-1"><i class="bi ${GB.escape(c.icon)} text-primary-gb me-1" aria-hidden="true"></i>${GB.escape(c.name)}</h2>${badge(c.status === 'Active' ? 'status-success' : 'status-muted', c.status)}</div>
        <small class="d-block mb-3">${prods.filter((p) => p.cat === c.slug).length} products · /${GB.escape(c.slug)}</small>
        <div class="d-flex gap-2"><button type="button" class="btn btn-sm btn-light-gb flex-fill" data-edit><i class="bi bi-pencil" aria-hidden="true"></i> Edit</button><button type="button" class="btn btn-sm btn-light-gb text-sale" data-delete aria-label="Delete ${GB.escape(c.name)}"><i class="bi bi-trash3" aria-hidden="true"></i></button></div></div></div></div>`).join('');
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-add-category]')) { editing = null; form.reset(); $('#categoryModalTitle').textContent = 'Add category'; modal('categoryModal').show(); }
      const card = e.target.closest('[data-slug]');
      if (!card) return;
      const all = get(); const c = all.find((x) => x.slug === card.dataset.slug);
      if (e.target.closest('[data-edit]')) { editing = c.slug; form.elements.name.value = c.name; form.elements.slug.value = c.slug; form.elements.icon.value = c.icon; form.elements.status.value = c.status; $('#categoryModalTitle').textContent = 'Edit category'; modal('categoryModal').show(); }
      if (e.target.closest('[data-delete]')) confirmDelete(`Delete category “${c.name}”?`, () => { GB.store.set('admin-categories', all.filter((x) => x !== c)); render(); GB.toast('Category deleted', 'info'); });
    });
    form.elements.name.addEventListener('input', () => { if (!editing) form.elements.slug.value = form.elements.name.value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
    form.addEventListener('gb:valid', () => {
      const all = get(); const f = form.elements;
      const data = { name: f.name.value.trim(), slug: f.slug.value.trim(), icon: f.icon.value.trim() || 'bi-basket', status: f.status.value };
      if (editing) Object.assign(all.find((x) => x.slug === editing), data);
      else all.push({ ...data, img: GB.root + 'assets/images/placeholder.svg' });
      GB.store.set('admin-categories', all); render(); modal('categoryModal').hide(); GB.toast(editing ? 'Category updated' : 'Category added');
    });
    render();
  }

  /* ---------- Orders ----------------------------------------------------- */
  function initOrders() {
    if (page !== 'admin-orders') return;
    const tbody = $('[data-admin-orders]');
    const search = $('[data-admin-search]');
    const filter = $('[data-admin-status]');
    const render = () => {
      const q = search.value.trim().toLowerCase(), f = filter.value;
      const rows = getOrders().filter((o) => (f === '' || String(o.status) === f) && (!q || (o.id + customerName(o.customer)).toLowerCase().includes(q)));
      $$('[data-order-tab-count]').forEach((el) => { const s = el.dataset.orderTabCount; el.textContent = getOrders().filter((o) => s === 'all' || String(o.status) === s).length; });
      tbody.innerHTML = rows.map((o) => `<tr data-id="${o.id}">
        <td data-label="Order"><strong class="text-heading">#${o.id}</strong>${o.local ? ' <span class="badge-soft small">storefront demo</span>' : ''}</td>
        <td data-label="Customer">${GB.escape(customerName(o.customer))}</td>
        <td data-label="Date">${fmtDate(o.date)}</td>
        <td data-label="Amount"><strong class="text-heading">${GB.formatPrice(o.total)}</strong></td>
        <td data-label="Payment">${badge(payClass(o.paymentStatus), o.paymentStatus)} <small class="d-block">${GB.paymentLabel ? GB.paymentLabel(o.payment) : o.payment}</small></td>
        <td data-label="Status"><label class="visually-hidden" for="st-${o.id}">Status for order ${o.id}</label><select class="form-select form-select-sm" id="st-${o.id}" data-status ${o.status === 0 ? 'disabled' : ''}>${STATUS.map((s, i) => `<option value="${i}" ${i === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td data-label="Actions" class="text-lg-end"><a class="btn btn-sm btn-light-gb" href="../order-tracking.html?order=${o.id}">Track</a></td></tr>`).join('')
        || '<tr><td colspan="7" class="text-center py-5">No orders found.</td></tr>';
    };
    tbody.addEventListener('change', (e) => {
      if (!e.target.matches('[data-status]')) return;
      const o = getOrders().find((x) => x.id === e.target.closest('tr').dataset.id);
      o.status = parseInt(e.target.value, 10);
      saveOrder(o); render();
      GB.toast(`Order #${o.id} marked “${STATUS[o.status]}” (customer notification needs backend)`);
    });
    $$('[data-status-tab]').forEach((b) => b.addEventListener('click', () => {
      filter.value = b.dataset.statusTab;
      $$('[data-status-tab]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
      render();
    }));
    [search, filter].forEach((el) => el.addEventListener('input', render));
    render();
  }

  /* ---------- Customers -------------------------------------------------- */
  function initCustomers() {
    if (page !== 'admin-customers') return;
    const tbody = $('[data-admin-customers]');
    const search = $('[data-admin-search]');
    const statusOverrides = GB.store.get('admin-customer-status', {});
    const render = () => {
      const q = search.value.trim().toLowerCase();
      tbody.innerHTML = CUSTOMERS.map((c) => ({ ...c, status: statusOverrides[c.id] || c.status })).filter((c) => !q || (c.name + c.email + c.city + c.phone).toLowerCase().includes(q)).map((c) => `<tr data-id="${c.id}">
        <td data-label="Customer"><div class="prod-cell"><img src="${c.img}" alt="" width="44" height="44" class="rounded-circle"><div><span class="fw-semibold text-heading d-block">${GB.escape(c.name)}</span><small>${c.id}</small></div></div></td>
        <td data-label="Contact"><span class="d-block">${GB.escape(c.email)}</span><small>${GB.escape(c.phone)}</small></td>
        <td data-label="City">${GB.escape(c.city)}</td>
        <td data-label="Orders">${c.orders}</td>
        <td data-label="Total spent"><strong class="text-heading">${GB.formatPrice(c.spent)}</strong></td>
        <td data-label="Status">${badge(c.status === 'Active' ? 'status-success' : c.status === 'Blocked' ? 'status-danger' : 'status-muted', c.status)}</td>
        <td data-label="Actions" class="text-lg-end"><div class="d-inline-flex gap-1"><button type="button" class="btn btn-sm btn-light-gb" data-view>View</button><button type="button" class="btn btn-sm btn-light-gb" data-block>${c.status === 'Blocked' ? 'Unblock' : 'Block'}</button></div></td></tr>`).join('')
        || '<tr><td colspan="7" class="text-center py-5">No customers found.</td></tr>';
    };
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]'); if (!row) return;
      const c = CUSTOMERS.find((x) => x.id === row.dataset.id);
      if (e.target.closest('[data-block]')) {
        const cur = statusOverrides[c.id] || c.status;
        statusOverrides[c.id] = cur === 'Blocked' ? 'Active' : 'Blocked';
        GB.store.set('admin-customer-status', statusOverrides); render();
        GB.toast(`${c.name} ${statusOverrides[c.id] === 'Blocked' ? 'blocked' : 'unblocked'}`);
      }
      if (e.target.closest('[data-view]')) {
        const el = $('#customerModal');
        el.querySelector('.modal-body').innerHTML = `<div class="text-center mb-3"><img src="${c.img}" alt="" width="84" height="84" class="rounded-circle mb-2"><h3 class="h5 mb-0">${GB.escape(c.name)}</h3><small>Customer since 2024 · ${c.id}</small></div>
          <ul class="info-list"><li><span>Email</span><span>${GB.escape(c.email)}</span></li><li><span>Phone</span><span>${GB.escape(c.phone)}</span></li><li><span>City</span><span>${GB.escape(c.city)}</span></li><li><span>Orders</span><span>${c.orders}</span></li><li><span>Total spent</span><span>${GB.formatPrice(c.spent)}</span></li><li><span>Avg. order</span><span>${GB.formatPrice(Math.round(c.spent / c.orders))}</span></li></ul>`;
        modal('customerModal').show();
      }
    });
    search.addEventListener('input', render);
    render();
  }

  /* ---------- Delivery --------------------------------------------------- */
  function initDelivery() {
    if (page !== 'admin-delivery') return;
    const tbody = $('[data-admin-deliveries]');
    const drivers = ['Ravi K.', 'Suresh P.', 'Imran S.', 'Deepak M.'];
    const render = () => {
      const rows = getOrders().filter((o) => o.status >= 2 && o.status <= 4);
      tbody.innerHTML = rows.map((o) => `<tr data-id="${o.id}">
        <td data-label="Order"><strong class="text-heading">#${o.id}</strong></td>
        <td data-label="Customer">${GB.escape(customerName(o.customer))}</td>
        <td data-label="Slot">${['', '', 'Today 4–7 PM', 'Today 1–4 PM', 'Today 10 AM–1 PM'][o.status]}</td>
        <td data-label="Driver"><label class="visually-hidden" for="drv-${o.id}">Driver for ${o.id}</label><select class="form-select form-select-sm" id="drv-${o.id}" data-driver><option value="Unassigned">Unassigned</option>${drivers.map((d) => `<option ${d === o.driver ? 'selected' : ''}>${d}</option>`).join('')}</select></td>
        <td data-label="Status">${badge(statusClass(o.status), STATUS[o.status])}</td>
        <td data-label="Actions" class="text-lg-end">${o.status < 4 ? '<button type="button" class="btn btn-sm btn-primary" data-dispatch>Mark out for delivery</button>' : '<button type="button" class="btn btn-sm btn-outline-primary" data-delivered>Mark delivered</button>'}</td></tr>`).join('')
        || '<tr><td colspan="6" class="text-center py-5">No active deliveries right now. 🎉</td></tr>';
      $$('[data-kpi="active-deliveries"]').forEach((el) => { el.textContent = rows.length; });
    };
    tbody.addEventListener('change', (e) => {
      if (!e.target.matches('[data-driver]')) return;
      const o = getOrders().find((x) => x.id === e.target.closest('tr').dataset.id);
      o.driver = e.target.value; saveOrder(o); GB.toast(`${o.driver} assigned to #${o.id}`);
    });
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]'); if (!row) return;
      const o = getOrders().find((x) => x.id === row.dataset.id);
      if (e.target.closest('[data-dispatch]')) { if (!o.driver || o.driver === 'Unassigned') { GB.toast('Assign a driver first', 'error'); return; } o.status = 4; saveOrder(o); render(); GB.toast(`#${o.id} is out for delivery`); }
      if (e.target.closest('[data-delivered]')) { o.status = 5; saveOrder(o); render(); GB.toast(`#${o.id} delivered`); }
    });
    const zoneForm = $('[data-zone-form]');
    if (zoneForm) zoneForm.addEventListener('gb:valid', () => {
      const tb = $('[data-zones]');
      const f = zoneForm.elements;
      tb.insertAdjacentHTML('beforeend', `<tr><td data-label="Zone"><strong class="text-heading">${GB.escape(f.zone.value)}</strong></td><td data-label="PIN codes">${GB.escape(f.pins.value)}</td><td data-label="Fee">${GB.formatPrice(f.fee.value)}</td><td data-label="Min. order">${GB.formatPrice(f.min.value)}</td><td data-label="Status">${badge('status-success', 'Active')}</td></tr>`);
      zoneForm.reset(); modal('zoneModal').hide(); GB.toast('Delivery zone added (demo)');
    });
    render();
  }

  /* ---------- Messages --------------------------------------------------- */
  function initMessages() {
    if (page !== 'admin-messages') return;
    const MSGS = [
      ['m1', 'Ananya Iyer', 'ananya.iyer@example.com', 'Missing item in order #GB10441', 'Hi team, my order arrived but the Greek yogurt was missing. Could you please refund or send it with my next order? Thanks!', '10:24 AM', true, '1438761681033-6461ffad8d80'],
      ['m2', 'Rahul Verma', 'rahul.verma@example.com', 'Bulk order for office pantry', 'We would like to place a recurring weekly order for our office pantry (around 40 people). Do you offer corporate pricing?', '9:02 AM', true, '1507003211169-0a1dd7228f2d'],
      ['m3', 'Sneha Kapoor', 'sneha.k@example.com', 'Delivery slot change', 'Can I move tomorrow\'s delivery from the morning slot to the evening slot?', 'Yesterday', false, '1534528741775-53994a69daeb'],
      ['m4', 'Fatima Khan', 'fatima.khan@example.com', 'Loved the mangoes!', 'Just wanted to say the Alphonso mangoes were amazing. Please keep them in stock!', 'Yesterday', false, '1573246123716-6b1782bfc499'],
      ['m5', 'Mohammed Aziz', 'm.aziz@example.com', 'Premium membership question', 'Does the Premium plan include free delivery on express slots too?', 'Mon', false, '1500648767791-00dcc994a43e']
    ].map(([id, name, email, subject, body, time, unread, img]) => ({ id, name, email, subject, body, time, unread, img: GB.img(img, 100) }));
    const read = GB.store.get('admin-read', []);
    MSGS.forEach((m) => { if (read.includes(m.id)) m.unread = false; });
    const list = $('[data-inbox]'), pane = $('[data-message-pane]');
    let current = null;
    const renderList = () => {
      list.innerHTML = MSGS.map((m) => `<button type="button" class="inbox-item ${m.unread ? 'unread' : ''} ${current === m.id ? 'active' : ''}" data-msg="${m.id}" aria-current="${current === m.id}">
        <img src="${m.img}" alt="" width="42" height="42"><span class="flex-grow-1 text-start overflow-hidden"><span class="d-flex justify-content-between gap-2"><strong>${GB.escape(m.name)}</strong><small>${m.time}</small></span><span class="d-block text-truncate subj">${GB.escape(m.subject)}</span></span></button>`).join('');
      const n = MSGS.filter((m) => m.unread).length;
      $$('[data-unread]').forEach((el) => { el.textContent = n; el.hidden = !n; });
    };
    const open = (id) => {
      const m = MSGS.find((x) => x.id === id); current = id; m.unread = false;
      if (!read.includes(id)) { read.push(id); GB.store.set('admin-read', read); }
      pane.innerHTML = `<div class="d-flex align-items-center gap-3 mb-3"><img src="${m.img}" alt="" width="52" height="52" class="rounded-circle"><div><h2 class="h5 mb-0">${GB.escape(m.subject)}</h2><small>${GB.escape(m.name)} &lt;${GB.escape(m.email)}&gt; · ${m.time}</small></div></div>
        <p class="text-body-gb">${GB.escape(m.body)}</p><hr>
        <form data-validate data-reply-form><label class="form-label" for="reply">Reply <span class="req" aria-hidden="true">*</span></label><textarea class="form-control mb-3" id="reply" name="reply" rows="4" required data-msg="Please write a reply."></textarea>
        <div class="d-flex gap-2 flex-wrap"><button class="btn btn-primary" type="submit"><i class="bi bi-send" aria-hidden="true"></i> Send reply</button><a class="btn btn-light-gb" href="mailto:${GB.escape(m.email)}?subject=${encodeURIComponent('Re: ' + m.subject)}">Open in email app</a></div></form>`;
      GB.bindForms(pane);
      pane.querySelector('[data-reply-form]').addEventListener('gb:valid', (e) => { e.target.reset(); GB.toast('Reply queued (demo – connect your email/helpdesk API)', 'info'); });
      renderList();
    };
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-msg]'); if (b) open(b.dataset.msg); });
    renderList();
  }

  /* ---------- Reports: CSV export ---------------------------------------- */
  function initReports() {
    if (page !== 'admin-reports') return;
    const btn = $('[data-export-csv]');
    const range = $('[data-report-range]');
    btn.addEventListener('click', () => {
      const rows = [['Month', 'Revenue (INR)', 'Orders', 'Avg order value (INR)']].concat(MONTHS.map((m, i) => [m, REVENUE[i] * 1000, ORDERS_M[i], Math.round((REVENUE[i] * 1000) / ORDERS_M[i])]));
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `greenbasket-sales-report-${range.value}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      GB.toast('Sales report downloaded (sample data)');
    });
    makeChart('topCatChart', () => ({
      type: 'bar',
      data: { labels: GB.categories.map((c) => c.name), datasets: [{ label: 'Revenue share %', data: CAT_SHARE, backgroundColor: palette(), borderRadius: 6 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    }));
  }

  /* ---------- Settings --------------------------------------------------- */
  function initSettings() {
    if (page !== 'admin-settings') return;
    $$('[data-settings-form]').forEach((form) => {
      const key = 'admin-settings-' + form.dataset.settingsForm;
      const saved = GB.store.get(key, {});
      Object.entries(saved).forEach(([k, v]) => { const el = form.elements[k]; if (!el) return; if (el.type === 'checkbox') el.checked = v; else el.value = v; });
      form.addEventListener('gb:valid', () => {
        const data = {};
        Array.from(form.elements).forEach((el) => { if (el.name) data[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
        GB.store.set(key, data);
        GB.toast('Settings saved in this browser (connect your API to persist)');
      });
    });
  }

  /* ---------- Admin page guard (demo) ----------------------------------- */
  function initGuard() {
    const note = $('[data-demo-guard]');
    if (note && !GB.store.get('admin')) note.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLayout();
    initGuard();
    initDashboard();
    initProducts();
    initCategories();
    initOrders();
    initCustomers();
    initDelivery();
    initMessages();
    initReports();
    initSettings();
  });
})();
