let cart = JSON.parse(localStorage.getItem("cart")) || [];

function formatPrice(n) {
  return "$" + Number(n).toFixed(2);
}

const orderItems = document.getElementById("order-items");
const sumSubtotal = document.getElementById("sum-subtotal");
const sumShipping = document.getElementById("sum-shipping");
const sumTotal = document.getElementById("sum-total");

/* Render cart items into checkout summary */
function loadSummary() {
  orderItems.innerHTML = "";

  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "order-item";
    row.innerHTML = `
      <span>${item.quantity} × ${item.name}</span>
      <span>${formatPrice(item.price * item.quantity)}</span>
    `;
    orderItems.appendChild(row);
  });

  const shipping = subtotal >= 50 ? 0 : (subtotal > 0 ? 5.99 : 0);
  const total = subtotal + shipping;

  sumSubtotal.textContent = formatPrice(subtotal);
  sumShipping.textContent = shipping === 0 ? "Free" : formatPrice(shipping);
  sumTotal.textContent = formatPrice(total);
}

/* Payment UI toggle */
document.querySelectorAll("input[name='payment']").forEach(r => {
  r.addEventListener("change", () => {
    const cardBlock = document.getElementById("card-details");
    if (r.value === "card") cardBlock.classList.remove("hidden");
    else cardBlock.classList.add("hidden");
  });
});

/* Place order */
document.getElementById("place-order").addEventListener("click", () => {
  const name = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const zip = document.getElementById("zip").value.trim();
  const payment = document.querySelector("input[name='payment']:checked").value;

  if (!name || !email || !phone || !address || !city || !zip) {
    alert("Please fill in all required fields.");
    return;
  }

  if (payment === "card") {
    const cardNum = document.getElementById("card-number").value.trim();
    const expiry = document.getElementById("card-expiry").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();

    if (!cardNum || !expiry || !cvv) {
      alert("Please fill complete card details.");
      return;
    }
  }

  alert("🎉 Order placed successfully!\n\nThank you for shopping at The Coffee Corner!");

  localStorage.removeItem("cart");
  window.location.href = "index.html";
});

/* Load summary on page start */
loadSummary();
