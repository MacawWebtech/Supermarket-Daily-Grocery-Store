/* ==========================================================================
   GreenBasket – dashboard.js
   Customer area + order tracking (front-end demo):
   - Sample order history (+ demo orders placed via checkout)
   - Overview stats, recent orders, order details modal
   - Order tracking timeline (customer area + order-tracking.html)
   - Shopping lists (create / rename / delete / add / remove / qty / add all to cart)
   - Saved addresses (add / edit / delete / default)
   - Profile & password forms, logout
   Real order history, tracking and accounts require a backend API.
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});

  /* ---------- Sample orders (dates relative to today) ------------------- */
  const daysAgo = (n, h = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 15, 0, 0); return d.toISOString(); };
  const SAMPLE = [
    { id: 'GB10482', date: daysAgo(0, 9), items: [['p10', 2], ['p20', 1], ['p11', 1], ['p02', 1], ['p03', 2]], payment: 'upi', paymentStatus: 'Paid', status: 4, slot: 'Today, 1 PM – 4 PM' },
    { id: 'GB10457', date: daysAgo(3), items: [['p35', 1], ['p36', 1], ['p39', 2], ['p37', 1]], payment: 'card', paymentStatus: 'Paid', status: 5, slot: 'Delivered' },
    { id: 'GB10431', date: daysAgo(6), items: [['p15', 2], ['p01', 1], ['p12', 2], ['p25', 1]], payment: 'cod', paymentStatus: 'Paid', status: 5, slot: 'Delivered' },
    { id: 'GB10418', date: daysAgo(1, 18), items: [['p40', 1], ['p41', 1], ['p44', 2]], payment: 'online', paymentStatus: 'Paid', status: 3, slot: 'Tomorrow, 7 AM – 10 AM' },
    { id: 'GB10396', date: daysAgo(12), items: [['p26', 1], ['p21', 2], ['p13', 1]], payment: 'upi', paymentStatus: 'Paid', status: 5, slot: 'Delivered' },
    { id: 'GB10388', date: daysAgo(15), items: [['p16', 1], ['p05', 1]], payment: 'card', paymentStatus: 'Refunded', status: 0, slot: 'Cancelled' },
    { id: 'GB10350', date: daysAgo(24), items: [['p30', 3], ['p31', 1], ['p32', 2], ['p23', 1]], payment: 'cod', paymentStatus: 'Paid', status: 5, slot: 'Delivered' }
  ];
  GB.STATUS_STEPS = [
    { label: 'Order Placed', icon: 'bi-receipt' },
    { label: 'Order Confirmed', icon: 'bi-clipboard-check' },
    { label: 'Packed', icon: 'bi-box-seam' },
    { label: 'Out for Delivery', icon: 'bi-truck' },
    { label: 'Delivered', icon: 'bi-house-check' }
  ];
  GB.statusBadge = (s) => s === 0 ? '<span class="status-badge status-danger">Cancelled</span>'
    : s === 5 ? '<span class="status-badge status-success">Delivered</span>'
      : s === 4 ? '<span class="status-badge status-info">Out for delivery</span>'
        : `<span class="status-badge status-warning">${GB.STATUS_STEPS[s - 1].label}</span>`;
  const payBadge = (s) => `<span class="status-badge ${/paid/i.test(s) ? 'status-success' : /refund/i.test(s) ? 'status-muted' : 'status-warning'}">${GB.escape(s)}</span>`;

  /** All orders: demo orders placed in this browser first, then sample history. */
  GB.allOrders = () => {
    const local = (GB.store.get('orders', []) || []).map((o) => ({
      id: o.id, date: o.date, lines: o.items.map((i) => ({ name: i.name, unit: i.unit, qty: i.qty, price: i.price, img: i.img })),
      total: o.totals.total, payment: o.payment, paymentStatus: o.paymentStatus, status: o.status, slot: `${new Date(o.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${GB.slotLabel ? GB.slotLabel(o.slot.time) : o.slot.time}`,
      address: o.address, demo: true
    }));
    const sample = SAMPLE.map((o) => {
      const lines = o.items.map(([id, qty]) => { const p = GB.findProduct(id) || GB.defaultProducts.find((x) => x.id === id); return { name: p.name, unit: p.unit, qty, price: p.price, img: p.img }; });
      const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
      return { ...o, lines, total: sub + (sub >= 499 ? 0 : 40), address: { line1: '14, Green Park Avenue', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' } };
    });
    return [...local, ...sample];
  };
  GB.findOrder = (id) => GB.allOrders().find((o) => o.id.toUpperCase() === String(id).trim().toUpperCase());
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  /* ---------- Tracking timeline ----------------------------------------- */
  GB.renderTracker = (el, order) => {
    const s = order.status;
    const base = new Date(order.date).getTime();
    const offsets = [0, 0.25, 2, 4, 6]; // hours after placing (demo)
    const pct = s <= 1 ? 0 : ((s - 1) / 4) * 80;
    el.innerHTML = `<div class="tracker" role="list" aria-label="Order progress">
      <div class="progress-line" style="width:${pct}%" aria-hidden="true"></div>
      ${GB.STATUS_STEPS.map((st, i) => {
        const n = i + 1;
        const cls = s === 0 ? '' : n < s || s === 5 ? 'done' : n === s ? 'current' : '';
        const when = n <= s ? new Date(base + offsets[i] * 36e5).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Pending';
        return `<div class="track-step ${cls}" role="listitem" ${n === s ? 'aria-current="step"' : ''}>
          <div class="dot"><i class="bi ${cls === 'done' ? 'bi-check-lg' : st.icon}" aria-hidden="true"></i></div>
          <div><strong>${st.label}</strong><small>${s === 0 && n > 1 ? '—' : when}</small></div></div>`;
      }).join('')}</div>
      ${s === 0 ? '<p class="text-sale fw-semibold mt-3 mb-0"><i class="bi bi-x-circle" aria-hidden="true"></i> This order was cancelled and refunded.</p>' : ''}`;
  };

  /* ---------- Order details modal ---------------------------------------- */
  function orderModal(order) {
    let m = document.getElementById('orderDetailsModal');
    if (!m) {
      m = document.createElement('div');
      m.className = 'modal fade'; m.id = 'orderDetailsModal'; m.tabIndex = -1;
      m.setAttribute('aria-labelledby', 'orderDetailsTitle'); m.setAttribute('aria-hidden', 'true');
      m.innerHTML = '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h5" id="orderDetailsTitle"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"></div><div class="modal-footer"></div></div></div>';
      document.body.appendChild(m);
    }
    m.querySelector('.modal-title').textContent = `Order #${order.id}`;
    m.querySelector('.modal-body').innerHTML = `
      <div class="d-flex flex-wrap gap-3 justify-content-between mb-3"><div><small class="d-block">Placed on</small><strong class="text-heading">${fmtDate(order.date)}</strong></div>
      <div><small class="d-block">Payment</small><strong class="text-heading">${GB.paymentLabel ? GB.paymentLabel(order.payment) : order.payment}</strong> ${payBadge(order.paymentStatus)}</div>
      <div><small class="d-block">Status</small>${GB.statusBadge(order.status)}</div></div>
      <div data-modal-tracker class="mb-4"></div>
      <h3 class="h6">Items</h3>
      ${order.lines.map((l) => `<div class="mini-item"><img src="${l.img}" alt="" width="54" height="54"><div><div class="name">${GB.escape(l.name)}</div><small>${GB.escape(l.unit)} × ${l.qty}</small></div><span class="price-col">${GB.formatPrice(l.price * l.qty)}</span></div>`).join('')}
      <div class="summary-row total"><span>Total paid</span><span>${GB.formatPrice(order.total)}</span></div>
      <p class="small mb-0 mt-2"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${GB.escape([order.address.line1, order.address.city, order.address.pincode].filter(Boolean).join(', '))}</p>
      ${order.demo ? '<p class="demo-note mt-3 mb-0"><i class="bi bi-info-circle" aria-hidden="true"></i> Demo order stored only in this browser.</p>' : ''}`;
    GB.renderTracker(m.querySelector('[data-modal-tracker]'), order);
    m.querySelector('.modal-footer').innerHTML = `<button type="button" class="btn btn-light-gb" data-reorder="${order.id}"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> Reorder items</button><a class="btn btn-primary" href="${GB.root}order-tracking.html?order=${order.id}">Track order</a>`;
    bootstrap.Modal.getOrCreateInstance(m).show();
  }

  const orderRow = (o, compact) => `<tr>
    <td data-label="Order ID"><strong class="text-heading">#${o.id}</strong></td>
    <td data-label="Date">${fmtDate(o.date)}</td>
    <td data-label="Products"><span class="text-truncate d-inline-block" style="max-width:220px">${GB.escape(o.lines.map((l) => l.name).join(', '))}</span></td>
    <td data-label="Amount"><strong class="text-heading">${GB.formatPrice(o.total)}</strong></td>
    ${compact ? '' : `<td data-label="Payment">${payBadge(o.paymentStatus)}</td>`}
    <td data-label="Delivery">${GB.statusBadge(o.status)}</td>
    <td data-label="Action" class="text-lg-end"><button type="button" class="btn btn-sm btn-outline-primary" data-view-order="${o.id}">View details</button></td></tr>`;

  /* ---------- Overview & orders pages ---------------------------------- */
  function initOrders() {
    const recent = GB.qs('[data-recent-orders]');
    const all = GB.qs('[data-orders-table]');
    const orders = GB.allOrders();
    const stat = (k, v) => GB.qsa(`[data-stat="${k}"]`).forEach((el) => { el.textContent = v; });
    stat('total', orders.length);
    stat('pending', orders.filter((o) => o.status > 0 && o.status < 5).length);
    stat('completed', orders.filter((o) => o.status === 5).length);
    stat('lists', getLists().length);
    if (recent) recent.innerHTML = orders.slice(0, 4).map((o) => orderRow(o, false)).join('');
    if (all) {
      const filter = GB.qs('[data-orders-filter]');
      const search = GB.qs('[data-orders-search]');
      const empty = GB.qs('[data-orders-empty]');
      const render = () => {
        const f = filter ? filter.value : 'all', q = search ? search.value.trim().toLowerCase() : '';
        const list = orders.filter((o) => (f === 'all' || (f === 'active' && o.status > 0 && o.status < 5) || (f === 'delivered' && o.status === 5) || (f === 'cancelled' && o.status === 0)) && (!q || (o.id + ' ' + o.lines.map((l) => l.name).join(' ')).toLowerCase().includes(q)));
        all.innerHTML = list.map((o) => orderRow(o, false)).join('');
        if (empty) empty.hidden = list.length > 0;
      };
      if (filter) filter.addEventListener('change', render);
      if (search) search.addEventListener('input', render);
      render();
    }
    // Active order tracker on overview
    const live = GB.qs('[data-live-tracker]');
    if (live) {
      const active = orders.find((o) => o.status > 0 && o.status < 5);
      if (active) {
        GB.qs('[data-live-order-id]').textContent = '#' + active.id;
        GB.qs('[data-live-order-slot]').textContent = active.slot;
        GB.renderTracker(live, active);
      } else live.closest('.card-gb').hidden = true;
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view-order]');
      if (b && window.bootstrap) { const o = GB.findOrder(b.dataset.viewOrder); if (o) orderModal(o); }
      const r = e.target.closest('[data-reorder]');
      if (r) {
        const o = GB.findOrder(r.dataset.reorder);
        const sample = SAMPLE.find((s) => s.id === o.id);
        let n = 0;
        if (sample) sample.items.forEach(([id, qty]) => { const p = GB.findProduct(id); if (p && p.stock > 0) { GB.cart.add(id, qty); n++; } });
        else (GB.store.get('orders', []).find((x) => x.id === o.id) || { items: [] }).items.forEach((i) => { const p = GB.findProduct(i.id); if (p && p.stock > 0) { GB.cart.add(i.id, i.qty, i.unit); n++; } });
        GB.toast(n ? `${n} item(s) added to your cart` : 'These items are currently unavailable', n ? 'success' : 'info', n ? { text: 'View cart', href: GB.root + 'cart.html' } : null);
      }
    });
  }

  /* ---------- Delivery updates list (tracking page) ---------------------- */
  function renderUpdates(el, order) {
    const s = order.status;
    const base = new Date(order.date).getTime();
    const offsets = [0, 0.25, 2, 4, 6];
    const msgs = [
      ['Order placed', 'We received your order and payment details.'],
      ['Order confirmed', 'The store accepted your order.'],
      ['Packed', 'Your groceries are packed and ready for pickup.'],
      ['Out for delivery', 'Your delivery partner is on the way.'],
      ['Delivered', 'Your order was delivered. Enjoy!']
    ];
    const fmt = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const events = s === 0
      ? [{ t: base + 36e5, title: 'Order cancelled', text: 'Your payment was refunded to the original method.' }, { t: base, title: msgs[0][0], text: msgs[0][1] }]
      : msgs.slice(0, s).map((m, i) => ({ t: base + offsets[i] * 36e5, title: m[0], text: m[1] })).reverse();
    el.innerHTML = events.map((e) => `<li><div><strong>${GB.escape(e.title)}</strong><small>${GB.escape(e.text)}</small></div><time>${fmt(e.t)}</time></li>`).join('');
  }

  /* ---------- Live map tracking (Leaflet + OpenStreetMap) ----------------- */
  // DEMO ONLY: coordinates and driver movement are simulated. Replace ROUTE and
  // the position update with data from your delivery/tracking API.
  const STORE = [12.9352, 77.6245];
  const ROUTE = [STORE, [12.9341, 77.6283], [12.9308, 77.6301], [12.9262, 77.6322], [12.9215, 77.6349], [12.9178, 77.6371]];
  let trackMap = null, trackTimer = null;
  const pin = (cls, icon) => L.divIcon({ className: '', html: `<div class="map-pin ${cls}"><i class="bi ${icon}" aria-hidden="true"></i></div>`, iconSize: [36, 36], iconAnchor: [18, 18] });
  const pointAt = (t) => {
    const seg = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
    let d = t * seg.reduce((a, b) => a + b, 0);
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) { const k = Math.min(1, d / seg[i]); return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k]; }
      d -= seg[i];
    }
  };
  function renderTrackMap(order) {
    const card = GB.qs('[data-tr-map-card]');
    clearInterval(trackTimer);
    if (trackMap) { trackMap.remove(); trackMap = null; }
    if (order.status === 0) { card.hidden = true; return; }
    card.hidden = false;
    const el = GB.qs('#trackMap');
    const badge = GB.qs('[data-tr-map-status]');
    const note = GB.qs('[data-tr-map-note]');
    if (!window.L) { el.innerHTML = '<div class="p-4 text-center">The map could not load. Check your internet connection.</div>'; return; }
    const s = order.status;
    const labels = { 1: 'Order received', 2: 'Being prepared', 3: 'Packed at store', 4: 'On the way', 5: 'Delivered' };
    badge.textContent = labels[s];
    note.textContent = s === 4 ? 'Demo location: the driver position is simulated.' : 'Live driver location appears once connected to your tracking API.';
    trackMap = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(trackMap);
    const home = ROUTE[ROUTE.length - 1];
    L.polyline(ROUTE, { color: '#2f9e4a', weight: 5, opacity: .85, dashArray: s === 5 ? null : '10 8' }).addTo(trackMap);
    L.marker(STORE, { icon: pin('pin-store', 'bi-shop'), title: 'GreenBasket store' }).addTo(trackMap);
    L.marker(home, { icon: pin('pin-home', 'bi-house-door-fill'), title: 'Your address' }).addTo(trackMap);
    trackMap.fitBounds(L.latLngBounds(ROUTE), { padding: [40, 40] });
    if (s >= 3) {
      let t = s === 5 ? 1 : s === 4 ? 0.55 : 0;
      const driver = L.marker(pointAt(t), { icon: pin('pin-driver', 'bi-truck'), title: 'Delivery partner', zIndexOffset: 500 }).addTo(trackMap);
      if (s === 4) trackTimer = setInterval(() => { t = Math.min(0.95, t + 0.02); driver.setLatLng(pointAt(t)); }, 3000);
    }
    setTimeout(() => trackMap && trackMap.invalidateSize(), 120);
  }

  /* ---------- Public order tracking page --------------------------------- */
  function initTrackingPage() {
    const form = GB.qs('[data-track-form]');
    if (!form) return;
    const result = GB.qs('[data-track-result]');
    const notFound = GB.qs('[data-track-notfound]');
    const show = (id) => {
      const o = GB.findOrder(id);
      result.hidden = !o; notFound.hidden = !!o;
      if (!o) { notFound.querySelector('[data-track-query]').textContent = id; return; }
      GB.qs('[data-tr-id]').textContent = '#' + o.id;
      GB.qs('[data-tr-date]').textContent = fmtDate(o.date);
      GB.qs('[data-tr-status]').innerHTML = GB.statusBadge(o.status);
      const eta = o.status === 5 ? 'Delivered' : o.status === 0 ? 'Cancelled' : o.slot;
      GB.qs('[data-tr-eta]').textContent = eta;
      GB.qs('[data-tr-address]').textContent = [o.address.line1, o.address.line2, o.address.city, o.address.state, o.address.pincode].filter(Boolean).join(', ');
      GB.qs('[data-tr-items]').innerHTML = o.lines.map((l) => `<div class="mini-item"><img src="${l.img}" alt="" width="54" height="54"><div><div class="name">${GB.escape(l.name)}</div><small>${GB.escape(l.unit)} × ${l.qty}</small></div><span class="price-col">${GB.formatPrice(l.price * l.qty)}</span></div>`).join('');
      GB.qs('[data-tr-total]').textContent = GB.formatPrice(o.total);
      const sub = o.lines.reduce((t, l) => t + l.price * l.qty, 0);
      const diff = o.total - sub;
      GB.qs('[data-tr-subtotal]').textContent = GB.formatPrice(sub);
      GB.qs('[data-tr-fee-label]').textContent = diff < 0 ? 'Discount' : 'Delivery fee';
      GB.qs('[data-tr-fee]').textContent = diff === 0 ? 'Free' : (diff < 0 ? '−' : '') + GB.formatPrice(Math.abs(diff));
      GB.qs('[data-tr-payment]').textContent = GB.paymentLabel ? GB.paymentLabel(o.payment) : o.payment;
      GB.qs('[data-tr-paystatus]').innerHTML = payBadge(o.paymentStatus);
      renderUpdates(GB.qs('[data-tr-updates]'), o);
      renderTrackMap(o);
      GB.qs('[data-tr-agent]').hidden = o.status !== 4;
      GB.renderTracker(GB.qs('[data-tr-timeline]'), o);
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    form.addEventListener('gb:valid', () => show(form.elements.orderId.value));
    const q = new URLSearchParams(location.search).get('order');
    if (q) { form.elements.orderId.value = q; show(q); }
    GB.qsa('[data-try-order]').forEach((b) => b.addEventListener('click', () => { form.elements.orderId.value = b.dataset.tryOrder; show(b.dataset.tryOrder); }));
  }

  /* ---------- Shopping lists -------------------------------------------- */
  const listsKey = 'lists';
  const getLists = () => {
    let lists = GB.store.get(listsKey);
    if (!Array.isArray(lists)) {
      lists = [
        { id: 'l1', name: 'Weekly Essentials', items: [{ id: 'p10', qty: 2 }, { id: 'p20', qty: 1 }, { id: 'p11', qty: 1 }, { id: 'p02', qty: 1 }, { id: 'p03', qty: 1 }] },
        { id: 'l2', name: 'Sunday Brunch', items: [{ id: 'p21', qty: 1 }, { id: 'p05', qty: 1 }, { id: 'p25', qty: 1 }, { id: 'p12', qty: 1 }] }
      ];
      GB.store.set(listsKey, lists);
    }
    return lists;
  };
  const saveLists = (lists) => GB.store.set(listsKey, lists);

  function initLists() {
    const box = GB.qs('[data-lists]');
    const preview = GB.qs('[data-lists-preview]');
    if (preview) {
      preview.innerHTML = getLists().slice(0, 3).map((l) => `<li class="d-flex justify-content-between align-items-center py-2 border-bottom"><span><i class="bi bi-card-checklist text-primary-gb me-2" aria-hidden="true"></i>${GB.escape(l.name)}</span><span class="badge-soft">${l.items.length} items</span></li>`).join('') || '<li class="py-2">No shopping lists yet.</li>';
    }
    if (!box) return;
    const modalEl = GB.qs('#listModal');
    const form = GB.qs('[data-list-form]');
    const addModalEl = GB.qs('#addToListModal');
    const addForm = GB.qs('[data-add-item-form]');
    const productSel = addForm.elements.productId;
    productSel.innerHTML = '<option value="">Choose a product…</option>' + GB.categories.map((c) => `<optgroup label="${GB.escape(c.name)}">${GB.getProducts().filter((p) => p.cat === c.slug).map((p) => `<option value="${p.id}">${GB.escape(p.name)} (${GB.escape(p.unit)}) – ${GB.formatPrice(p.price)}</option>`).join('')}</optgroup>`).join('');

    const render = () => {
      const lists = getLists();
      GB.qsa('[data-stat="lists"]').forEach((el) => { el.textContent = lists.length; });
      if (!lists.length) {
        box.innerHTML = '<div class="empty-state"><div class="ic"><i class="bi bi-card-checklist" aria-hidden="true"></i></div><h2>No shopping lists yet</h2><p>Create a list for weekly groceries, parties or recipes and add it to your cart in one click.</p><button type="button" class="btn btn-primary" data-new-list><i class="bi bi-plus-lg" aria-hidden="true"></i> Create your first list</button></div>';
        return;
      }
      box.innerHTML = lists.map((l) => {
        const lines = l.items.map((i) => ({ ...i, p: GB.findProduct(i.id) })).filter((i) => i.p);
        const total = lines.reduce((s, i) => s + i.p.price * i.qty, 0);
        return `<section class="list-card" data-list="${l.id}" aria-labelledby="list-${l.id}">
          <div class="head">
            <div><h3 id="list-${l.id}">${GB.escape(l.name)}</h3><small>${lines.length} product${lines.length === 1 ? '' : 's'} · Estimated ${GB.formatPrice(total)}</small></div>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-light-gb" data-add-item><i class="bi bi-plus-lg" aria-hidden="true"></i> Add product</button>
              <button type="button" class="btn btn-sm btn-light-gb" data-rename-list aria-label="Rename ${GB.escape(l.name)}"><i class="bi bi-pencil" aria-hidden="true"></i> Rename</button>
              <button type="button" class="btn btn-sm btn-light-gb" data-delete-list aria-label="Delete ${GB.escape(l.name)}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
              <button type="button" class="btn btn-sm btn-primary" data-list-to-cart ${lines.length ? '' : 'disabled'}><i class="bi bi-cart-plus" aria-hidden="true"></i> Add all to cart</button>
            </div>
          </div>
          ${lines.length ? lines.map((i) => `<div class="list-row" data-item="${i.id}">
            <img src="${i.p.img}" alt="" width="52" height="52">
            <div><a class="fw-semibold text-heading" href="${GB.productUrl(i.p)}">${GB.escape(i.p.name)}</a><div class="small">${GB.escape(i.p.unit)} · ${GB.formatPrice(i.p.price)} · <span class="stock-label ${GB.stockState(i.p)}">${GB.stockLabel(i.p)}</span></div></div>
            <div class="qty" role="group" aria-label="Quantity of ${GB.escape(i.p.name)}"><button type="button" data-list-step="-1" aria-label="Decrease"><i class="bi bi-dash" aria-hidden="true"></i></button><input type="number" min="1" max="99" value="${i.qty}" aria-label="Quantity" data-list-qty><button type="button" data-list-step="1" aria-label="Increase"><i class="bi bi-plus" aria-hidden="true"></i></button></div>
            <div class="row-actions"><button type="button" class="remove-btn" data-list-remove aria-label="Remove ${GB.escape(i.p.name)} from list"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>
          </div>`).join('') : '<p class="p-4 mb-0 text-center">This list is empty. Use <strong>Add product</strong> to start filling it.</p>'}
        </section>`;
      }).join('');
    };

    let editing = null, addingTo = null;
    const modal = () => bootstrap.Modal.getOrCreateInstance(modalEl);
    box.parentElement.addEventListener('click', (e) => {
      if (e.target.closest('[data-new-list]')) {
        editing = null; form.reset(); GB.qs('#listModalTitle').textContent = 'Create shopping list'; modal().show();
        return;
      }
      const card = e.target.closest('[data-list]');
      if (!card) return;
      const lists = getLists();
      const list = lists.find((l) => l.id === card.dataset.list);
      if (e.target.closest('[data-rename-list]')) {
        editing = list.id; form.reset(); form.elements.listName.value = list.name; GB.qs('#listModalTitle').textContent = 'Rename list'; modal().show();
      } else if (e.target.closest('[data-delete-list]')) {
        if (confirm(`Delete the list “${list.name}”?`)) { saveLists(lists.filter((l) => l !== list)); render(); GB.toast('List deleted', 'info'); }
      } else if (e.target.closest('[data-add-item]')) {
        addingTo = list.id; addForm.reset(); GB.qs('#addToListTitle').textContent = `Add product to “${list.name}”`; bootstrap.Modal.getOrCreateInstance(addModalEl).show();
      } else if (e.target.closest('[data-list-to-cart]')) {
        let n = 0;
        list.items.forEach((i) => { const p = GB.findProduct(i.id); if (p && p.stock > 0) { GB.cart.add(i.id, i.qty); n++; } });
        GB.toast(`${n} product(s) from “${list.name}” added to cart`, 'success', { text: 'View cart', href: GB.root + 'cart.html' });
      } else {
        const row = e.target.closest('[data-item]');
        if (!row) return;
        const item = list.items.find((i) => i.id === row.dataset.item);
        const st = e.target.closest('[data-list-step]');
        if (st) { item.qty = Math.max(1, Math.min(99, item.qty + parseInt(st.dataset.listStep, 10))); saveLists(lists); render(); }
        if (e.target.closest('[data-list-remove]')) { list.items = list.items.filter((i) => i !== item); saveLists(lists); render(); GB.toast('Removed from list', 'info'); }
      }
    });
    box.addEventListener('change', (e) => {
      if (!e.target.matches('[data-list-qty]')) return;
      const lists = getLists();
      const list = lists.find((l) => l.id === e.target.closest('[data-list]').dataset.list);
      const item = list.items.find((i) => i.id === e.target.closest('[data-item]').dataset.item);
      item.qty = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
      saveLists(lists); render();
    });
    form.addEventListener('gb:valid', () => {
      const lists = getLists();
      const name = form.elements.listName.value.trim();
      if (editing) { lists.find((l) => l.id === editing).name = name; GB.toast('List renamed'); }
      else { lists.push({ id: 'l' + Date.now(), name, items: [] }); GB.toast(`“${name}” created`); }
      saveLists(lists); render(); modal().hide();
    });
    addForm.addEventListener('gb:valid', () => {
      const lists = getLists();
      const list = lists.find((l) => l.id === addingTo);
      const id = addForm.elements.productId.value;
      const qty = Math.max(1, parseInt(addForm.elements.qty.value, 10) || 1);
      const ex = list.items.find((i) => i.id === id);
      if (ex) ex.qty = Math.min(99, ex.qty + qty); else list.items.push({ id, qty });
      saveLists(lists); render();
      bootstrap.Modal.getOrCreateInstance(addModalEl).hide();
      GB.toast(`${GB.findProduct(id).name} added to “${list.name}”`);
    });
    document.addEventListener('gb:currency', render);
    render();
  }

  /* ---------- Addresses --------------------------------------------------- */
  const getAddresses = () => {
    let a = GB.store.get('addresses');
    if (!Array.isArray(a)) {
      a = [
        { id: 'a1', label: 'Home', name: 'Priya Sharma', phone: '9876543210', line1: '14, Green Park Avenue', line2: 'Koramangala 4th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', isDefault: true },
        { id: 'a2', label: 'Office', name: 'Priya Sharma', phone: '9876543210', line1: 'Level 6, Prestige Tech Park', line2: 'Outer Ring Road, Marathahalli', city: 'Bengaluru', state: 'Karnataka', pincode: '560103', isDefault: false }
      ];
      GB.store.set('addresses', a);
    }
    return a;
  };
  function initAddresses() {
    const box = GB.qs('[data-addresses]');
    if (!box) return;
    const modalEl = GB.qs('#addressModal');
    const form = GB.qs('[data-address-form]');
    let editing = null;
    const render = () => {
      const list = getAddresses();
      box.innerHTML = list.map((a) => `<div class="col-md-6"><div class="address-card ${a.isDefault ? 'default' : ''}" data-address="${a.id}">
        <div class="d-flex justify-content-between align-items-start mb-2"><span class="badge-soft"><i class="bi ${a.label === 'Office' ? 'bi-briefcase' : 'bi-house'}" aria-hidden="true"></i> ${GB.escape(a.label)}</span>${a.isDefault ? '<span class="status-badge status-success">Default</span>' : ''}</div>
        <strong class="text-heading d-block">${GB.escape(a.name)}</strong>
        <p class="mb-1">${GB.escape(a.line1)}${a.line2 ? ', ' + GB.escape(a.line2) : ''}<br>${GB.escape(a.city)}, ${GB.escape(a.state)} – ${GB.escape(a.pincode)}</p>
        <p class="small mb-3"><i class="bi bi-telephone" aria-hidden="true"></i> ${GB.escape(a.phone)}</p>
        <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-sm btn-light-gb" data-edit-address><i class="bi bi-pencil" aria-hidden="true"></i> Edit</button>
        ${a.isDefault ? '' : '<button type="button" class="btn btn-sm btn-light-gb" data-default-address>Set as default</button>'}
        <button type="button" class="btn btn-sm btn-light-gb" data-delete-address aria-label="Delete ${GB.escape(a.label)} address"><i class="bi bi-trash3" aria-hidden="true"></i></button></div>
      </div></div>`).join('') || '<div class="col-12"><div class="empty-state"><div class="ic"><i class="bi bi-geo-alt" aria-hidden="true"></i></div><h2>No saved addresses</h2><p>Add an address to speed up checkout.</p></div></div>';
    };
    const modal = () => bootstrap.Modal.getOrCreateInstance(modalEl);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-new-address]')) { editing = null; form.reset(); GB.qs('#addressModalTitle').textContent = 'Add new address'; modal().show(); return; }
      const card = e.target.closest('[data-address]');
      if (!card) return;
      const list = getAddresses();
      const a = list.find((x) => x.id === card.dataset.address);
      if (e.target.closest('[data-edit-address]')) {
        editing = a.id; form.reset();
        ['label', 'name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].forEach((k) => { form.elements[k].value = a[k] || ''; });
        form.elements.isDefault.checked = a.isDefault;
        GB.qs('#addressModalTitle').textContent = 'Edit address'; modal().show();
      }
      if (e.target.closest('[data-default-address]')) { list.forEach((x) => { x.isDefault = x === a; }); GB.store.set('addresses', list); render(); GB.toast('Default address updated'); }
      if (e.target.closest('[data-delete-address]') && confirm('Delete this address?')) {
        const rest = list.filter((x) => x !== a);
        if (a.isDefault && rest[0]) rest[0].isDefault = true;
        GB.store.set('addresses', rest); render(); GB.toast('Address deleted', 'info');
      }
    });
    form.addEventListener('gb:valid', () => {
      const list = getAddresses();
      const data = {};
      ['label', 'name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].forEach((k) => { data[k] = form.elements[k].value.trim(); });
      data.isDefault = form.elements.isDefault.checked || !list.length;
      if (data.isDefault) list.forEach((x) => { x.isDefault = false; });
      if (editing) Object.assign(list.find((x) => x.id === editing), data);
      else list.push({ id: 'a' + Date.now(), ...data });
      GB.store.set('addresses', list); render(); modal().hide();
      GB.toast(editing ? 'Address updated' : 'Address saved');
    });
    render();
  }

  /* ---------- Profile ------------------------------------------------------ */
  function initProfile() {
    const pf = GB.qs('[data-profile-form]');
    const pw = GB.qs('[data-password-form]');
    const prefs = GB.qs('[data-prefs-form]');
    const user = GB.store.get('user') || { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '9876543210' };
    if (pf) {
      const [first, ...rest] = (user.name || '').split(' ');
      pf.elements.firstName.value = first || '';
      pf.elements.lastName.value = rest.join(' ');
      pf.elements.email.value = user.email || '';
      pf.elements.phone.value = user.phone || '';
      if (user.dob) pf.elements.dob.value = user.dob;
      pf.addEventListener('gb:valid', () => {
        const u = { ...(GB.store.get('user') || {}), name: `${pf.elements.firstName.value.trim()} ${pf.elements.lastName.value.trim()}`.trim(), email: pf.elements.email.value.trim(), phone: pf.elements.phone.value.trim(), dob: pf.elements.dob.value };
        GB.store.set('user', u);
        fillUser();
        GB.toast('Profile updated (saved in this browser)');
      });
    }
    if (pw) pw.addEventListener('gb:valid', () => { pw.reset(); GB.toast('Password change requires a backend – nothing was changed (demo).', 'info'); });
    if (prefs) {
      const saved = GB.store.get('notify-prefs', { email: true, sms: true, offers: false });
      Object.keys(saved).forEach((k) => { if (prefs.elements[k]) prefs.elements[k].checked = saved[k]; });
      prefs.addEventListener('change', () => {
        GB.store.set('notify-prefs', { email: prefs.elements.email.checked, sms: prefs.elements.sms.checked, offers: prefs.elements.offers.checked });
        GB.toast('Notification preferences saved');
      });
    }
  }

  function fillUser() {
    const u = GB.store.get('user') || { name: 'Priya Sharma', email: 'priya.sharma@example.com' };
    GB.qsa('[data-user-name]').forEach((el) => { el.textContent = u.name || 'Customer'; });
    GB.qsa('[data-user-first]').forEach((el) => { el.textContent = (u.name || 'there').split(' ')[0]; });
    GB.qsa('[data-user-email]').forEach((el) => { el.textContent = u.email || ''; });
  }

  function initMisc() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-logout]')) {
        e.preventDefault();
        const u = GB.store.get('user');
        if (u) GB.store.set('user', { ...u, loggedIn: false });
        location.href = GB.root + 'pages/login.html';
      }
      if (e.target.closest('[data-mark-read]')) {
        GB.qsa('.notif-item.unread').forEach((n) => n.classList.remove('unread'));
        GB.qsa('[data-unread-count]').forEach((b) => b.remove());
        GB.toast('All notifications marked as read');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    fillUser();
    initOrders();
    initTrackingPage();
    initLists();
    initAddresses();
    initProfile();
    initMisc();
  });
})();
