/* main.js
   Clean, modular, and robust inline quantity + cart badge handling.
   - addToCart(name, image, price, btnRef) uses btnRef (this) when provided.
   - Falls back to heuristics (onclick/title) only when btnRef is not provided.
   - Updates header badge and wires cart icon to open cart.html.
   - Search open/close, suggestions UI (stacked), keyboard nav, and click -> #products scroll.
*/

(function () {
  'use strict';

  /* ----------------------- Utilities ----------------------- */

  function safeParse(key, fallback = []) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function safeSave(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  }

  /* ----------------------- Cart badge ----------------------- */

  function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const cart = safeParse('cart', []);
    const total = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const display = total > 99 ? '99+' : String(total);
    badge.textContent = display;

    if (total > 0) {
      badge.classList.remove('hidden');
      badge.style.display = 'inline-flex';
      try {
        badge.animate(
          [{ transform: 'scale(0.84)' }, { transform: 'scale(1)' }],
          { duration: 140, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      } catch (err) {}
    } else {
      badge.classList.add('hidden');
    }
  }

  window.__updateCartBadge = updateCartBadge;

  /* ----------------------- Storage helpers ----------------------- */

  function addProductToCart({ name, image, price, quantity = 1 }) {
    const cart = safeParse('cart', []);
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + Number(quantity || 1);
    } else {
      cart.push({
        name,
        image,
        price: Number(price),
        quantity: Number(quantity || 1)
      });
    }
    safeSave('cart', cart);
    if (typeof updateCartBadge === 'function') {
      try { updateCartBadge(); } catch (e) {}
    }
  }

  /* ----------------------- Tiny toast (confirmation) ----------------------- */

  function showTinyToast(text) {
    const t = document.createElement('div');
    t.className = 'tiny-toast';
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => {
      t.classList.remove('visible');
      setTimeout(() => t.remove(), 300);
    }, 1200);
  }

  /* ----------------------- Inline quantity node ----------------------- */

  function createInlineQtyNode(initialQty = 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-qty';
    wrapper.innerHTML = `
      <div class="inline-qty-controls" role="group" aria-label="Quantity">
        <button type="button" class="inline-minus" aria-label="Decrease">−</button>
        <input type="text" class="inline-qty-input" value="${initialQty}" readonly />
        <button type="button" class="inline-plus" aria-label="Increase">+</button>
      </div>
      <div class="inline-qty-actions">
        <button type="button" class="inline-add btn primary small">Add</button>
        <button type="button" class="inline-cancel btn ghost small">Cancel</button>
      </div>
    `;
    return wrapper;
  }

  /* ----------------------- Fallback button finders ----------------------- */

  function findButtonByOnclickName(name) {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const targetName = norm(name).replace(/['"]+/g, '');
    const buttons = Array.from(document.querySelectorAll('button[onclick]'));
    for (const b of buttons) {
      const onclickAttr = (b.getAttribute('onclick') || '').toLowerCase();
      if (!onclickAttr) continue;
      const cleaned = onclickAttr.replace(/['"]/g, '');
      if (cleaned.indexOf(targetName) !== -1) return b;
    }
    return null;
  }

  function findButtonByNearbyTitle(name) {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const target = norm(name);
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      const container = b.closest('.box') || b.closest('.box-content') || b.parentElement;
      if (!container) continue;
      const title = container.querySelector('h3, h4, .product-title');
      if (title && norm(title.textContent) === target) return b;
    }
    return null;
  }

  /* ----------------------- Public addToCart ----------------------- */

  window.addToCart = function (name, image, price, btnRef) {
    let triggerBtn = btnRef || null;
    if (!triggerBtn) {
      triggerBtn = findButtonByOnclickName(name) || findButtonByNearbyTitle(name);
    }
    if (!triggerBtn) {
      triggerBtn = Array.from(document.querySelectorAll('button'))
        .find(b => (b.textContent || '').trim().toUpperCase() === 'ADD TO CART') || null;
    }
    if (!triggerBtn) {
      console.warn('Add-to-cart button not found for', name, '- adding directly.');
      addProductToCart({ name, image, price, quantity: 1 });
      showTinyToast(`1 × ${name} added`);
      return;
    }
    if (triggerBtn.dataset.inlineActive === '1') return;
    triggerBtn.dataset.inlineActive = '1';
    triggerBtn.style.display = 'none';
    const inlineNode = createInlineQtyNode(1);
    triggerBtn.parentNode.insertBefore(inlineNode, triggerBtn.nextSibling);

    const input = inlineNode.querySelector('.inline-qty-input');
    const plus = inlineNode.querySelector('.inline-plus');
    const minus = inlineNode.querySelector('.inline-minus');
    const addBtn = inlineNode.querySelector('.inline-add');
    const cancelBtn = inlineNode.querySelector('.inline-cancel');

    function ensureNumber(n) {
      n = parseInt(n, 10);
      if (isNaN(n) || n < 1) return 1;
      if (n > 999) return 999;
      return n;
    }

    plus.addEventListener('click', () => {
      input.value = String(ensureNumber(Number(input.value) + 1));
    });

    minus.addEventListener('click', () => {
      input.value = String(ensureNumber(Number(input.value) - 1));
    });

    cancelBtn.addEventListener('click', restore);

    addBtn.addEventListener('click', () => {
      const qty = ensureNumber(Number(input.value));
      addProductToCart({ name, image, price, quantity: qty });
      showTinyToast(`${qty} × ${name} added`);
      restore();
    });

    function restore() {
      if (inlineNode && inlineNode.parentNode) inlineNode.parentNode.removeChild(inlineNode);
      triggerBtn.style.display = '';
      delete triggerBtn.dataset.inlineActive;
    }
  };

  /* ----------------------- Cart icon wiring & initialize ----------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof updateCartBadge === 'function') updateCartBadge();
    const cartBtn = document.getElementById('cart-button') || document.querySelector('.cart');
    if (cartBtn) {
      cartBtn.addEventListener('click', function () {
        window.location.href = 'cart.html';
      });
      if (!cartBtn.getAttribute('role')) cartBtn.setAttribute('role', 'button');
      cartBtn.setAttribute('tabindex', cartBtn.getAttribute('tabindex') || '0');
      cartBtn.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' || e.key === ' ') window.location.href = 'cart.html';
      });
    }
  });

  /* ----------------------- Cross-tab updates ----------------------- */

  window.addEventListener('storage', function (e) {
    if (e.key === 'cart') {
      if (typeof updateCartBadge === 'function') {
        try { updateCartBadge(); } catch (err) {}
      }
    }
  });

})(); // IIFE end


// ---------------- Search open/close behavior ----------------
(function wireSearch() {
  function closeWrapper(wrapper) {
    wrapper.classList.remove('active');
    const input = wrapper.querySelector('.search-input');
    if (input) input.blur();
  }

  function openWrapper(wrapper) {
    wrapper.classList.add('active');
    const input = wrapper.querySelector('.search-input');
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.search-btn');
    if (btn) {
      const wrapper = btn.closest('.search-wrapper');
      if (!wrapper) return;
      if (wrapper.classList.contains('active')) closeWrapper(wrapper);
      else openWrapper(wrapper);
      return;
    }

    const openWrappers = document.querySelectorAll('.search-wrapper.active');
    if (openWrappers.length) {
      const outside = !e.target.closest('.search-wrapper');
      if (outside) openWrappers.forEach(closeWrapper);
    }
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.search-wrapper.active').forEach(w => closeWrapper(w));
      return;
    }
    const activeEl = document.activeElement;
    if (activeEl && activeEl.closest && activeEl.closest('.search-btn') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const wrapper = activeEl.closest('.search-wrapper');
      if (wrapper) {
        if (wrapper.classList.contains('active')) closeWrapper(wrapper);
        else openWrapper(wrapper);
      }
    }
  });

  document.addEventListener('keypress', function (e) {
    const input = e.target;
    if (input && input.classList && input.classList.contains('search-input') && e.key === 'Enter') {
      e.preventDefault();
      const query = input.value.trim();
      if (query) {
        console.log('Search for:', query);
      }
    }
  });
})();


/* ---------------- Search suggestions: show product list stacked vertically ---------------- */
(function wireSearchSuggestions() {
  document.querySelectorAll('.search-wrapper').forEach((wrapper) => {
    if (wrapper.querySelector('.search-suggestions')) return;
    const suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions';
    suggestions.innerHTML = `<div class="item-list" role="list"></div>`;
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(suggestions);
  });

  const productCards = Array.from(document.querySelectorAll('.shop-section .box'));

  const products = productCards.map(card => {
    const titleEl = card.querySelector('h3, h4, .product-title');
    const title = titleEl ? titleEl.textContent.trim() : 'Product';
    const imgEl = card.querySelector('.box-img');
    let image = '';
    if (imgEl) {
      const bg = imgEl.style.backgroundImage || getComputedStyle(imgEl).backgroundImage;
      const m = /url\(["']?(.+?)["']?\)/.exec(bg);
      image = m ? m[1] : '';
    }
    const priceAttr = card.getAttribute('data-price') || '';
    const price = priceAttr ? Number(priceAttr) : null;
    return { title, image, price, card };
  });

  function renderSuggestions(wrapper, items, highlightIndex = -1) {
    const list = wrapper.querySelector('.search-suggestions .item-list');
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No products found';
      list.appendChild(empty);
      return;
    }

    items.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'suggestion';
      row.setAttribute('role', 'option');
      row.setAttribute('tabindex', '-1');
      if (idx === highlightIndex) row.setAttribute('aria-selected', 'true');

      row.innerHTML = `
        <div class="thumb" style="background-image:url('${p.image || ''}')"></div>
        <div class="meta">
          <div class="title">${escapeHtml(p.title)}</div>
          ${p.price ? `<div class="price">${formatPrice(p.price)}</div>` : ''}
        </div>
      `;

      row.addEventListener('click', () => {
        closeAllSuggestions();

        const productsSection = document.querySelector('#products');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (p.card) {
          setTimeout(() => {
            try {
              p.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              p.card.classList.add('product-highlight');
              setTimeout(() => p.card.classList.remove('product-highlight'), 1000);
            } catch (err) {}
          }, 600);
        }

        const wrapperInput = row.closest('.search-wrapper') && row.closest('.search-wrapper').querySelector('.search-input');
        if (wrapperInput) wrapperInput.blur();
      });

      list.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function openSuggestions(wrapper) {
    wrapper.classList.add('suggestions-open');
    renderSuggestions(wrapper, products);
  }
  function closeSuggestions(wrapper) {
    wrapper.classList.remove('suggestions-open');
  }
  function closeAllSuggestions() {
    document.querySelectorAll('.search-wrapper.suggestions-open').forEach(closeSuggestions);
  }

  function filterProducts(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products.filter(p => p.title.toLowerCase().includes(q));
  }

  document.addEventListener('focusin', (e) => {
    const input = e.target;
    if (input && input.classList && input.classList.contains('search-input')) {
      const wrapper = input.closest('.search-wrapper');
      if (!wrapper) return;
      openSuggestions(wrapper);
      renderSuggestions(wrapper, filterProducts(input.value));
      wrapper.__highlight = -1;
    }
  });

  document.addEventListener('mouseenter', (e) => {
    const wrapper = e.target.closest && e.target.closest('.search-wrapper');
    if (wrapper && wrapper.querySelector('.search-input')) {
      openSuggestions(wrapper);
      const input = wrapper.querySelector('.search-input');
      renderSuggestions(wrapper, filterProducts(input.value));
    }
  }, true);

  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input || !input.classList || !input.classList.contains('search-input')) return;
    const wrapper = input.closest('.search-wrapper');
    if (!wrapper) return;
    const list = filterProducts(input.value);
    renderSuggestions(wrapper, list);
    wrapper.__highlight = -1;
  });

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains('search-input')) return;
    const wrapper = active.closest('.search-wrapper');
    if (!wrapper) return;
    const listEl = wrapper.querySelector('.search-suggestions .item-list');
    if (!listEl) return;
    const items = Array.from(listEl.querySelectorAll('.suggestion'));
    if (!items.length) return;

    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      wrapper.__highlight = Math.min((wrapper.__highlight || -1) + 1, items.length - 1);
      items.forEach((it, i) => it.toggleAttribute('aria-selected', i === wrapper.__highlight));
      items[wrapper.__highlight].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      wrapper.__highlight = Math.max((wrapper.__highlight || 0) - 1, 0);
      items.forEach((it, i) => it.toggleAttribute('aria-selected', i === wrapper.__highlight));
      items[wrapper.__highlight].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = wrapper.__highlight >= 0 ? wrapper.__highlight : 0;
      if (items[idx]) items[idx].click();
    } else if (e.key === 'Escape') {
      closeSuggestions(wrapper);
      active.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      closeAllSuggestions();
    }
  }, { passive: true });

})();
