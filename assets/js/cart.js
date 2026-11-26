/* ==========================================================================
   GreenBasket – cart.js
   - GB.cart: cart store persisted in localStorage ("gb-cart")
   - Cart page rendering ([data-cart-page])
   - Checkout page ([data-checkout]) and order confirmation ([data-order-confirmation])
   IMPORTANT: Checkout here is a FRONT-END DEMO. No payment is taken and no
   order reaches a store. Orders are saved only in this browser ("gb-orders").
   Connect a backend + payment gateway before going live (see documentation).
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});

  /* ---------- Pricing rules (edit to match your store) ----------------- */
  GB.rules = {
    freeDeliveryFrom: 499,   // INR – orders at or above this ship free
    deliveryFee: 40,         // INR – standard fee below the threshold
    expressFee: 60,          // INR – extra for 90-minute express slot
    coupons: {               // demo coupon codes
      FRESH10: { type: 'percent', value: 10, max: 150, label: '10% off (max ₹150)' },
      WELCOME50: { type: 'flat', value: 50, min: 299, label: '₹50 off orders above ₹299' }
    }
  };

  /* ---------- Cart store ------------------------------------------------ */
  const KEY = 'cart';
  const read = () => GB.store.get(KEY, []);
  const write = (items, bump) => {
    GB.store.set(KEY, items);
    GB.updateBadges(bump ? 'cart' : null);
    document.dispatchEvent(new CustomEvent('gb:cart'));
  };
  const keyOf = (id, unit) => `${id}|${unit}`;

  GB.cart = {
    /** Lines joined with product data; lines whose product no longer exists are dropped. */
    items() {
      return read().map((l) => {
        const p = GB.findProduct(l.id);
        if (!p) return null;
        const u = p.units.find((x) => x.label === l.unit) || p.units[0];
        const price = Math.round(p.price * u.mult);
        return { key: keyOf(l.id, u.label), id: l.id, unit: u.label, qty: l.qty, product: p, price, oldPrice: p.oldPrice ? Math.round(p.oldPrice * u.mult) : 0, total: price * l.qty };
      }).filter(Boolean);
    },
    find(id, unit) { return this.items().find((l) => l.key === keyOf(id, unit)) || null; },
    add(id, qty = 1, unit) {
      const items = read();
      const p = GB.findProduct(id);
      unit = unit || (p ? p.units[0].label : '');
      const line = items.find((l) => keyOf(l.id, l.unit) === keyOf(id, unit));
      const max = p ? Math.max(1, Math.min(p.stock, 99)) : 99;
      if (line) line.qty = Math.min(max, line.qty + qty);
      else items.push({ id, unit, qty: Math.min(max, qty) });
      write(items, true);
    },
    setQty(key, qty) {
      let items = read();
      if (qty <= 0) items = items.filter((l) => keyOf(l.id, l.unit) !== key);
      else items.forEach((l) => { if (keyOf(l.id, l.unit) === key) { const p = GB.findProduct(l.id); l.qty = Math.min(qty, p ? Math.max(1, Math.min(p.stock, 99)) : 99); } });
      write(items);
    },
    remove(key) { write(read().filter((l) => keyOf(l.id, l.unit) !== key)); },
    clear() { write([]); },
    count() { return this.items().reduce((n, l) => n + l.qty, 0); },
    coupon() { return GB.store.get('coupon', null); },
    totals(opts = {}) {
      const lines = this.items();
      const subtotal = lines.reduce((s, l) => s + l.total, 0);
      const savings = lines.reduce((s, l) => s + (l.oldPrice ? (l.oldPrice - l.price) * l.qty : 0), 0);
      const code = this.coupon();
      const c = code && GB.rules.coupons[code];
      let discount = 0;
      if (c && subtotal) {
        if (c.type === 'percent') discount = Math.min(Math.round(subtotal * c.value / 100), c.max || Infinity);
        if (c.type === 'flat' && subtotal >= (c.min || 0)) discount = c.value;
      }
      const delivery = !subtotal ? 0 : (subtotal >= GB.rules.freeDeliveryFrom ? 0 : GB.rules.deliveryFee) + (opts.express ? GB.rules.expressFee : 0);
      return { lines, subtotal, savings, discount, delivery, coupon: c ? code : null, total: Math.max(0, subtotal - discount + delivery) };
    }
  };

  /* ---------- Shared summary renderer ---------------------------------- */
  GB.renderSummary = (box, opts = {}) => {
    if (!box) return;
    const t = GB.cart.totals(opts);
    const left = Math.max(0, GB.rules.freeDeliveryFrom - t.subtotal);
    const pct = Math.min(100, Math.round((t.subtotal / GB.rules.freeDeliveryFrom) * 100));
    box.innerHTML = `
      <div class="summary-row"><span>Subtotal (${GB.cart.count()} items)</span><strong class="text-heading">${GB.formatPrice(t.subtotal)}</strong></div>
      <div class="summary-row"><span>Delivery charges${opts.express ? ' (incl. express)' : ''}</span><strong class="${t.delivery ? 'text-heading' : 'text-primary-gb'}">${t.delivery ? GB.formatPrice(t.delivery) : 'FREE'}</strong></div>
      <div class="summary-row"><span>Coupon discount${t.coupon ? ` <span class="badge-soft">${t.coupon}</span>` : ''}</span><strong class="text-primary-gb">${t.discount ? '− ' + GB.formatPrice(t.discount) : GB.formatPrice(0)}</strong></div>
      <div class="summary-row total"><span>Total amount</span><span>${GB.formatPrice(t.total)}</span></div>
      ${t.savings ? `<p class="small text-primary-gb fw-semibold mb-0 mt-2"><i class="bi bi-tag-fill" aria-hidden="true"></i> You save ${GB.formatPrice(t.savings + t.discount)} on this order</p>` : ''}
      ${t.subtotal ? `<div class="mt-3 small">${left ? `Add <strong class="text-heading">${GB.formatPrice(left)}</strong> more for <strong class="text-heading">free delivery</strong>.` : '<i class="bi bi-truck" aria-hidden="true"></i> Your order qualifies for <strong class="text-heading">free delivery</strong>.'}
        <div class="free-delivery-bar" role="progressbar" aria-label="Progress to free delivery" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div></div>` : ''}`;
  };

  /* ---------- Cart page -------------------------------------------------- */
  function initCartPage() {
    const page = GB.qs('[data-cart-page]');
    if (!page) return;
    const list = GB.qs('[data-cart-items]', page);
    const filled = GB.qs('[data-cart-filled]', page);
    const empty = GB.qs('[data-cart-empty]', page);
    const summary = GB.qs('[data-cart-summary]', page);
    const couponForm = GB.qs('[data-coupon-form]', page);
    const couponMsg = GB.qs('[data-coupon-msg]', page);

    const render = () => {
      const lines = GB.cart.items();
      filled.hidden = !lines.length;
      empty.hidden = !!lines.length;
      GB.qsa('[data-cart-heading-count]').forEach((el) => { el.textContent = `${GB.cart.count()} item${GB.cart.count() === 1 ? '' : 's'}`; });
      list.innerHTML = lines.map((l) => `
        <div class="cart-item" data-key="${GB.escape(l.key)}">
          <a href="${GB.productUrl(l.product)}"><img src="${l.product.img}" alt="${GB.escape(l.product.name)}" width="88" height="88"></a>
          <div>
            <h3><a href="${GB.productUrl(l.product)}">${GB.escape(l.product.name)}</a></h3>
            <div class="meta">Unit: <strong class="text-heading">${GB.escape(l.unit)}</strong> · Price: ${GB.formatPrice(l.price)} ${l.oldPrice ? `<del class="small">${GB.formatPrice(l.oldPrice)}</del>` : ''}</div>
            <span class="stock-label ${GB.stockState(l.product)} small">${GB.stockLabel(l.product)}</span>
          </div>
          <div class="right">
            <div class="qty" role="group" aria-label="Quantity for ${GB.escape(l.product.name)}">
              <button type="button" data-step="-1" aria-label="Decrease quantity"><i class="bi bi-dash" aria-hidden="true"></i></button>
              <input type="number" min="1" max="99" value="${l.qty}" aria-label="Quantity" data-qty-input>
              <button type="button" data-step="1" aria-label="Increase quantity"><i class="bi bi-plus" aria-hidden="true"></i></button>
            </div>
            <span class="line-total">${GB.formatPrice(l.total)}</span>
            <button type="button" class="remove-btn" data-remove aria-label="Remove ${GB.escape(l.product.name)} from cart"><i class="bi bi-trash3" aria-hidden="true"></i></button>
          </div>
        </div>`).join('');
      GB.renderSummary(summary);
      const c = GB.cart.coupon();
      if (couponMsg) couponMsg.innerHTML = c ? `<span class="text-primary-gb"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> ${c} applied – ${GB.rules.coupons[c].label}.</span> <button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-remove-coupon>Remove</button>` : 'Try <strong>FRESH10</strong> or <strong>WELCOME50</strong> (demo codes).';
    };

    page.addEventListener('click', (e) => {
      const row = e.target.closest('[data-key]');
      if (e.target.closest('[data-remove-coupon]')) { GB.store.remove('coupon'); render(); return; }
      if (e.target.closest('[data-clear-cart]')) { GB.cart.clear(); GB.toast('Cart cleared', 'info'); return; }
      if (!row) return;
      const line = GB.cart.items().find((l) => l.key === row.dataset.key);
      if (!line) return;
      const step = e.target.closest('[data-step]');
      if (step) GB.cart.setQty(line.key, Math.max(1, line.qty + parseInt(step.dataset.step, 10)));
      if (e.target.closest('[data-remove]')) {
        GB.cart.remove(line.key);
        GB.toast(`${line.product.name} removed from cart`, 'info');
      }
    });
    page.addEventListener('change', (e) => {
      if (!e.target.matches('[data-qty-input]')) return;
      const row = e.target.closest('[data-key]');
      GB.cart.setQty(row.dataset.key, Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)));
    });
    if (couponForm) couponForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = couponForm.querySelector('input');
      const code = input.value.trim().toUpperCase();
      if (!code) { input.classList.add('is-invalid'); return; }
      if (GB.rules.coupons[code]) { GB.store.set('coupon', code); input.classList.remove('is-invalid'); input.value = ''; GB.toast(`Coupon ${code} applied`); render(); }
      else { input.classList.add('is-invalid'); GB.toast('That coupon code is not valid', 'error'); }
    });
    document.addEventListener('gb:cart', render);
    document.addEventListener('gb:currency', render);
    render();
  }

  /* ---------- Checkout --------------------------------------------------- */
  function initCheckout() {
    const page = GB.qs('[data-checkout]');
    if (!page) return;
    const form = GB.qs('[data-checkout-form]', page);
    const itemsBox = GB.qs('[data-checkout-items]', page);
    const summary = GB.qs('[data-checkout-summary]', page);
    const empty = GB.qs('[data-checkout-empty]', page);
    const dateSel = GB.qs('[data-delivery-date]', page);

    // Next 6 days for scheduled delivery
    const fmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    for (let i = 0; i < 6; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const o = document.createElement('option');
      o.value = d.toISOString().slice(0, 10);
      o.textContent = (i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : '') + fmt.format(d);
      dateSel.appendChild(o);
    }

    // Pre-fill from demo profile / saved default address
    const user = GB.store.get('user');
    const addr = (GB.store.get('addresses', []) || []).find((a) => a.isDefault);
    const fill = (name, v) => { const el = form.elements[name]; if (el && v && !el.value) el.value = v; };
    if (user) { fill('fullName', user.name); fill('email', user.email); fill('phone', user.phone); }
    if (addr) { fill('address1', addr.line1); fill('address2', addr.line2); fill('city', addr.city); fill('pincode', addr.pincode); fill('state', addr.state); }

    const isExpress = () => (form.querySelector('[name="slot"]:checked') || {}).value === 'express';
    const render = () => {
      const lines = GB.cart.items();
      empty.hidden = !!lines.length;
      form.hidden = !lines.length;
      itemsBox.innerHTML = lines.map((l) => `<div class="mini-item"><img src="${l.product.img}" alt="" width="54" height="54"><div><div class="name">${GB.escape(l.product.name)}</div><small>${GB.escape(l.unit)} × ${l.qty}</small></div><span class="price-col">${GB.formatPrice(l.total)}</span></div>`).join('');
      GB.renderSummary(summary, { express: isExpress() });
    };

    // Payment method panels
    const panels = () => {
      const m = (form.querySelector('[name="payment"]:checked') || {}).value;
      GB.qsa('[data-pay-panel]', form).forEach((p) => {
        const on = p.dataset.payPanel === m;
        p.hidden = !on;
        GB.qsa('input, select', p).forEach((i) => { i.disabled = !on; });
      });
      const btn = GB.qs('[data-place-order-label]', form);
      if (btn) btn.textContent = m === 'cod' ? 'Place order (Cash on Delivery)' : 'Place order (demo – no charge)';
    };
    form.addEventListener('change', (e) => {
      if (e.target.name === 'payment') panels();
      if (e.target.name === 'slot') render();
    });
    panels();

    form.addEventListener('gb:valid', () => {
      const lines = GB.cart.items();
      if (!lines.length) return;
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Placing order…';
      const t = GB.cart.totals({ express: isExpress() });
      const f = form.elements;
      const payment = f.payment.value;
      /* ---------------------------------------------------------------
         PAYMENT INTEGRATION POINT (placeholder)
         - Stripe:   create a PaymentIntent on your server, then
                     stripe.confirmCardPayment(clientSecret, {...}) here.
         - PayPal:   render paypal.Buttons({ createOrder, onApprove }).
         - Razorpay / UPI gateways: open checkout with the order_id your
                     server created, verify the signature server-side.
         Never trust a client-side "paid" flag – confirm via webhooks.
         --------------------------------------------------------------- */
      const order = {
        id: 'GB' + Math.floor(10000 + Math.random() * 89999),
        date: new Date().toISOString(),
        items: lines.map((l) => ({ id: l.id, name: l.product.name, unit: l.unit, qty: l.qty, price: l.price, img: l.product.img })),
        totals: { subtotal: t.subtotal, delivery: t.delivery, discount: t.discount, total: t.total, coupon: t.coupon },
        customer: { name: f.fullName.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() },
        address: { line1: f.address1.value.trim(), line2: f.address2.value.trim(), city: f.city.value.trim(), state: f.state.value, pincode: f.pincode.value.trim(), notes: f.notes.value.trim() },
        slot: { date: f.deliveryDate.value, time: f.slot.value },
        payment,
        paymentStatus: payment === 'cod' ? 'Pay on delivery' : 'Demo – not charged',
        status: 1, // 1 Placed, 2 Confirmed, 3 Packed, 4 Out for delivery, 5 Delivered
        demo: true
      };
      setTimeout(() => {
        const orders = GB.store.get('orders', []);
        orders.unshift(order);
        GB.store.set('orders', orders.slice(0, 30));
        GB.store.remove('coupon');
        GB.cart.clear();
        location.href = `order-confirmation.html?order=${order.id}`;
      }, 900);
    });
    document.addEventListener('gb:cart', render);
    document.addEventListener('gb:currency', render);
    render();
  }

  /* ---------- Order confirmation ---------------------------------------- */
  GB.slotLabel = (v) => ({ morning: '7 AM – 10 AM', midday: '10 AM – 1 PM', afternoon: '1 PM – 4 PM', evening: '4 PM – 7 PM', night: '7 PM – 10 PM', express: 'Express (within 90 min)' }[v] || v);
  GB.paymentLabel = (v) => ({ cod: 'Cash on Delivery', card: 'Credit / Debit Card', upi: 'UPI', online: 'Online Payment (Net banking / Wallet)' }[v] || v);

  function initConfirmation() {
    const box = GB.qs('[data-order-confirmation]');
    if (!box) return;
    const id = new URLSearchParams(location.search).get('order');
    const order = (GB.store.get('orders', []) || []).find((o) => o.id === id);
    const found = GB.qs('[data-oc-found]', box), missing = GB.qs('[data-oc-missing]', box);
    if (!order) { found.hidden = true; missing.hidden = false; return; }
    const date = new Date(order.slot.date + 'T00:00:00');
    GB.qsa('[data-oc-id]', box).forEach((el) => { el.textContent = order.id; });
    GB.qs('[data-oc-name]', box).textContent = order.customer.name.split(' ')[0];
    GB.qs('[data-oc-email]', box).textContent = order.customer.email;
    GB.qs('[data-oc-slot]', box).textContent = `${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, ${GB.slotLabel(order.slot.time)}`;
    GB.qs('[data-oc-address]', box).textContent = [order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ');
    GB.qs('[data-oc-payment]', box).textContent = `${GB.paymentLabel(order.payment)} · ${order.paymentStatus}`;
    GB.qs('[data-oc-items]', box).innerHTML = order.items.map((i) => `<div class="mini-item"><img src="${i.img}" alt="" width="54" height="54"><div><div class="name">${GB.escape(i.name)}</div><small>${GB.escape(i.unit)} × ${i.qty}</small></div><span class="price-col">${GB.formatPrice(i.price * i.qty)}</span></div>`).join('');
    GB.qs('[data-oc-totals]', box).innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>${GB.formatPrice(order.totals.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>${order.totals.delivery ? GB.formatPrice(order.totals.delivery) : 'FREE'}</span></div>
      <div class="summary-row"><span>Discount</span><span>− ${GB.formatPrice(order.totals.discount)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${GB.formatPrice(order.totals.total)}</span></div>`;
    GB.qs('[data-oc-track]', box).href = `order-tracking.html?order=${order.id}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCartPage();
    initCheckout();
    initConfirmation();
  });
})();
