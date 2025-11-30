// cart.js — fixed + enhanced
let cart = JSON.parse(localStorage.getItem('cart')) || [];

const container = document.getElementById('cart-container');
const recsGrid = document.getElementById('recs-grid');
const summaryItems = document.getElementById('summary-items');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal = document.getElementById('summary-total');

function formatPrice(n){ return '$' + Number(n).toFixed(2); }

/* ===== Cart rendering & actions ===== */
function renderCart(){
  if (!container) return console.warn('No cart container found (#cart-container).');

  container.innerHTML = '';
  if(cart.length === 0){
    container.innerHTML = `
      <div class="cart-empty">
        <h2>Your cart is empty ☕</h2>
        <p>Add something from our recommendations.</p>
      </div>`;
    updateSummary();
    return;
  }

  cart.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="thumb" style="background-image:url('${item.image}')"></div>
      <div class="item-info">
        <h3>${escapeHtml(item.name)}</h3>
        <p>Unit price: ${formatPrice(item.price)}</p>
      </div>
      <div class="item-actions">
        <div class="qty-control">
          <button onclick="changeQty(${index}, -1)">−</button>
          <input type="text" readonly value="${item.quantity}">
          <button onclick="changeQty(${index}, 1)">+</button>
        </div>
        <div class="price">${formatPrice(item.price * item.quantity)}</div>
        <button class="remove" onclick="removeItem(${index})">Remove</button>
      </div>
    `;
    container.appendChild(div);
  });

  updateSummary();
}

/* small helper to avoid simple XSS when injecting names (keeps text safe) */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function changeQty(index, delta){
  const item = cart[index];
  if(!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveAndRender();
}

function removeItem(index){
  cart.splice(index, 1);
  saveAndRender();
}

function clearCart(){
  cart = [];
  saveAndRender();
}

function saveAndRender(){
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

/* ===== Summary ===== */
function updateSummary(){
  if (!summaryItems || !summarySubtotal || !summaryTotal) {
    // silently return if summary nodes missing (defensive)
    return;
  }
  const items = cart.reduce((s,i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s,i) => s + (i.price * i.quantity), 0);
  summaryItems.textContent = items;
  summarySubtotal.textContent = formatPrice(subtotal);
  const shipping = subtotal === 0 ? 0 : (subtotal >= 50 ? 0 : 5.99);
  const total = subtotal + shipping;
  summaryTotal.textContent = formatPrice(total);
}

/* ===== Recommendations (use your real product images) ===== */
const recs = [
  { name: "Arabian Coffee Beans", image: "p1.png", price: 15 },
  { name: "German Coffee Beans",  image: "p3.png", price: 20 },
  { name: "French Coffee Beans",   image: "p4.png", price: 22 },
  { name: "English Coffee Beans",  image: "p5.png", price: 17 }
];

function renderRecs(){
  // if there is no container for recommendations, do nothing
  if (!recsGrid) {
    console.warn('No recommendations grid found (#recs-grid). Skipping recommendations render.');
    return;
  }

  recsGrid.innerHTML = '';
  recs.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'rec-card';
    card.innerHTML = `
      <div class="rec-thumb" style="background-image:url('${p.image}')"></div>
      <h4>${escapeHtml(p.name)}</h4>
      <p>${formatPrice(p.price)}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px">
        <button class="primary" onclick="addToCartFromRec(${i})">Add</button>
        <button onclick="viewProduct(${i})">View</button>
      </div>
    `;
    recsGrid.appendChild(card);
  });
}

function addToCartFromRec(i){
  const p = recs[i];
  if (!p) return;
  const existing = cart.find(x => x.name === p.name);
  if (existing) existing.quantity++;
  else cart.push({ name: p.name, image: p.image, price: p.price, quantity: 1 });
  saveAndRender();
}

function viewProduct(i){
  const p = recs[i];
  if (!p) return;
  alert(`${p.name} — ${formatPrice(p.price)}`);
}

/* ===== Buttons: clear + checkout ===== */
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'clear-cart') {
    if (confirm("Clear all items?")) clearCart();
  }
  if (e.target && e.target.id === 'checkout') {
    window.location.href = "checkout.html";
}

});

/* ===== Initial render ===== */
renderRecs();
renderCart();

/* expose for inline onclick handlers (existing code uses inline onclick) */
window.changeQty = changeQty;
window.removeItem = removeItem;
window.addToCartFromRec = addToCartFromRec;
window.viewProduct = viewProduct;

