/* ==========================================================================
   GreenBasket – wishlist.js
   - GB.wishlist: saved product IDs persisted in localStorage ("gb-wishlist")
   - Wishlist page rendering ([data-wishlist-page])
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});
  const KEY = 'wishlist';

  const save = (ids) => {
    GB.store.set(KEY, ids);
    GB.updateBadges();
    document.dispatchEvent(new CustomEvent('gb:wishlist'));
  };

  GB.wishlist = {
    ids() { return (GB.store.get(KEY, []) || []).filter((id) => GB.findProduct(id)); },
    has(id) { return this.ids().includes(id); },
    /** Returns true when the product was added, false when removed. */
    toggle(id) {
      const ids = this.ids();
      const i = ids.indexOf(id);
      if (i > -1) ids.splice(i, 1); else ids.unshift(id);
      save(ids);
      return i === -1;
    },
    remove(id) { save(this.ids().filter((x) => x !== id)); },
    clear() { save([]); }
  };

  function initWishlistPage() {
    const page = GB.qs('[data-wishlist-page]');
    if (!page) return;
    const body = GB.qs('[data-wishlist-items]', page);
    const filled = GB.qs('[data-wishlist-filled]', page);
    const empty = GB.qs('[data-wishlist-empty]', page);

    const render = () => {
      const items = GB.wishlist.ids().map(GB.findProduct);
      filled.hidden = !items.length;
      empty.hidden = !!items.length;
      GB.qsa('[data-wishlist-heading-count]').forEach((el) => { el.textContent = `${items.length} saved item${items.length === 1 ? '' : 's'}`; });
      body.innerHTML = items.map((p) => `
        <tr data-id="${p.id}">
          <td data-label="Product"><div class="prod-cell"><img src="${p.img}" alt="" width="44" height="44"><div><a class="fw-semibold text-heading" href="${GB.productUrl(p)}">${GB.escape(p.name)}</a><div class="small">${GB.escape(p.unit)} · ${GB.escape(GB.categoryName(p.cat))}</div></div></div></td>
          <td data-label="Price"><div class="price"><span class="now fs-6">${GB.formatPrice(p.price)}</span>${p.oldPrice ? `<del>${GB.formatPrice(p.oldPrice)}</del>` : ''}</div></td>
          <td data-label="Stock"><span class="status-badge ${GB.stockState(p) === 'out' ? 'status-danger' : GB.stockState(p) === 'low' ? 'status-warning' : 'status-success'}">${GB.stockLabel(p)}</span></td>
          <td data-label="Actions" class="text-lg-end">
            <div class="d-inline-flex gap-2">
              <button type="button" class="btn btn-primary btn-sm" data-add-to-cart data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}><i class="bi bi-cart-plus" aria-hidden="true"></i> Add to cart</button>
              <button type="button" class="remove-btn" data-wish-remove aria-label="Remove ${GB.escape(p.name)} from wishlist"><i class="bi bi-trash3" aria-hidden="true"></i></button>
            </div>
          </td>
        </tr>`).join('');
    };

    page.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-wish-remove]');
      if (rm) {
        const id = rm.closest('[data-id]').dataset.id;
        GB.wishlist.remove(id);
        GB.toast('Removed from wishlist', 'info');
      }
      if (e.target.closest('[data-wishlist-all-to-cart]')) {
        const avail = GB.wishlist.ids().map(GB.findProduct).filter((p) => p.stock > 0);
        avail.forEach((p) => GB.cart.add(p.id, 1));
        GB.toast(avail.length ? `${avail.length} item(s) added to cart` : 'No in-stock items to add', avail.length ? 'success' : 'info', avail.length ? { text: 'View cart', href: GB.root + 'cart.html' } : null);
      }
      if (e.target.closest('[data-wishlist-clear]')) { GB.wishlist.clear(); GB.toast('Wishlist cleared', 'info'); }
    });
    document.addEventListener('gb:wishlist', render);
    document.addEventListener('gb:currency', render);
    render();
  }

  document.addEventListener('DOMContentLoaded', initWishlistPage);
})();
