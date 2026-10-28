
"use strict";

const grid = document.querySelector("#product-grid");
const search = document.querySelector("#search");
const categoryFilter = document.querySelector("#category-filter");
const sort = document.querySelector("#sort");
const cartDrawer = document.querySelector("#cart-drawer");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const toast = document.querySelector("#toast");

let products = [];
let cart = {};
let toastTimer = null;

// Add your WhatsApp number later, including country code.
// India example: 919876543210 (no +, spaces, or hyphens).
const WHATSAPP_NUMBER = "";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function notify(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function getProductId(product) {
  return String(product.id ?? "");
}

function getProductPrice(product) {
  const price = Number(product.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function isProductAvailable(product) {
  if (product.available === false || product.inStock === false) {
    return false;
  }

  if (
    product.stock !== undefined &&
    product.stock !== null &&
    product.stock !== "" &&
    Number(product.stock) <= 0
  ) {
    return false;
  }

  return true;
}

function getProductImageUrl(image) {
  if (typeof image !== "string" || !image.trim()) {
    return "";
  }

  const value = image.trim();

  // Allow normal website image paths and HTTP/HTTPS URLs only.
  if (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  ) {
    return value;
  }

  try {
    const url = new URL(value, window.location.href);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    // Invalid image URL: use the placeholder instead.
  }

  return "";
}

function imageMarkup(product) {
  const imageUrl = getProductImageUrl(product.image);
  const name = escapeHtml(product.name || "ZAYBH");

  if (imageUrl) {
    return `
      <img
        loading="lazy"
        src="${escapeHtml(imageUrl)}"
        alt="${name}"
        onerror="this.hidden=true;this.nextElementSibling.hidden=false"
      >
      <span class="placeholder-art" hidden>
        ${escapeHtml((product.name || "Z").charAt(0).toUpperCase())}
      </span>
    `;
  }

  return `
    <span class="placeholder-art">
      ${escapeHtml((product.name || "Z").charAt(0).toUpperCase())}
    </span>
  `;
}

function renderProducts() {
  if (!grid || !search || !categoryFilter || !sort) return;

  const query = search.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  let list = products.filter((product) => {
    const searchableText = [
      product.name,
      product.category,
      product.description,
      product.tag
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);
    const matchesCategory =
      selectedCategory === "all" ||
      String(product.category || "") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  switch (sort.value) {
    case "low":
      list.sort((a, b) => getProductPrice(a) - getProductPrice(b));
      break;

    case "high":
      list.sort((a, b) => getProductPrice(b) - getProductPrice(a));
      break;

    case "name":
      list.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      break;

    case "featured":
      list.sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      );
      break;
  }

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        No products found. Try another search or category.
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((product) => {
    const id = getProductId(product);
    const name = escapeHtml(product.name || "Unnamed product");
    const category = escapeHtml(product.category || "General");
    const price = money(getProductPrice(product));
    const available = isProductAvailable(product);

    return `
      <article class="product-card">
        <div class="product-image">
          ${imageMarkup(product)}
          ${
            product.tag
              ? `<span class="product-tag">${escapeHtml(product.tag)}</span>`
              : ""
          }
        </div>

        <div class="product-meta">
          <div>
            <h3>${name}</h3>
            <span class="product-category">${category}</span>
          </div>
          <span class="price">${price}</span>
        </div>

        <button
          class="add-button"
          data-add="${escapeHtml(id)}"
          ${available ? "" : "disabled"}
          aria-label="${
            available
              ? `Add ${name} to bag`
              : `${name} is currently unavailable`
          }"
        >
          ${available ? "ADD TO BAG +" : "CURRENTLY UNAVAILABLE"}
        </button>
      </article>
    `;
  }).join("");
}

function getCartEntries() {
  return Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({
      product: products.find(
        (item) => getProductId(item) === String(id)
      ),
      quantity
    }))
    .filter((entry) => entry.product);
}

function renderCart() {
  if (!cartItems || !cartCount || !cartTotal) return;

  const entries = getCartEntries();

  const count = entries.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  const total = entries.reduce(
    (sum, entry) =>
      sum + getProductPrice(entry.product) * entry.quantity,
    0
  );

  cartCount.textContent = count;
  cartTotal.textContent = money(total);

  if (!entries.length) {
    cartItems.innerHTML = `
      <p class="muted">
        Your bag is empty. Add something you like.
      </p>
    `;
    return;
  }

  cartItems.innerHTML = entries.map(({ product, quantity }) => {
    const id = escapeHtml(getProductId(product));
    const name = escapeHtml(product.name || "Unnamed product");
    const price = money(getProductPrice(product));

    return `
      <div class="cart-row">
        <div>
          <h3>${name}</h3>
          <p>${price} each</p>
        </div>

        <div class="quantity">
          <button
            data-qty="${id}"
            data-delta="-1"
            aria-label="Remove one ${name}"
          >−</button>

          <span>${quantity}</span>

          <button
            data-qty="${id}"
            data-delta="1"
            aria-label="Add one ${name}"
            ${isProductAvailable(product) ? "" : "disabled"}
          >+</button>
        </div>
      </div>
    `;
  }).join("");
}

function openCart() {
  if (!cartDrawer || !overlay) return;

  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}

function closeCart() {
  if (!cartDrawer || !overlay) return;

  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

function addToCart(id) {
  const product = products.find(
    (item) => getProductId(item) === String(id)
  );

  if (!product) {
    notify("This product could not be found.");
    return;
  }

  if (!isProductAvailable(product)) {
    notify("This product is currently unavailable.");
    return;
  }

  cart[id] = (cart[id] || 0) + 1;

  renderCart();
  notify("Added to your bag");
}

function changeCartQuantity(id, delta) {
  const product = products.find(
    (item) => getProductId(item) === String(id)
  );

  if (!product) {
    delete cart[id];
    renderCart();
    return;
  }

  if (delta > 0 && !isProductAvailable(product)) {
    notify("This product is currently unavailable.");
    return;
  }

  cart[id] = (cart[id] || 0) + delta;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  renderCart();
}

async function copyOrderMessage(message) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message);
      notify("Order enquiry copied. You can paste it into a message.");
      return;
    }
  } catch {
    // Clipboard permissions may be unavailable.
  }

  // Fallback for browsers that do not support clipboard access.
  const textArea = document.createElement("textarea");
  textArea.value = message;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textArea.remove();

  if (copied) {
    notify("Order enquiry copied. You can paste it into a message.");
  } else {
    window.prompt("Copy your order enquiry:", message);
  }
}

async function checkout() {
  const entries = getCartEntries();

  if (!entries.length) {
    notify("Your bag is empty");
    return;
  }

  const unavailable = entries.some(
    ({ product }) => !isProductAvailable(product)
  );

  if (unavailable) {
    notify("Remove unavailable products before continuing.");
    return;
  }

  const lines = entries.map(({ product, quantity }) => {
    const lineTotal = getProductPrice(product) * quantity;

    return `${product.name} x ${quantity} - ${money(lineTotal)}`;
  });

  const total = entries.reduce(
    (sum, entry) =>
      sum + getProductPrice(entry.product) * entry.quantity,
    0
  );

  const message = [
    "Hello ZAYBH, I would like to enquire about placing an order:",
    "",
    ...lines,
    "",
    `Estimated product total: ${money(total)}`,
    "",
    "Please confirm product availability, shipping charges, delivery time, and payment options."
  ].join("\n");

  // This is an enquiry, not a confirmed or paid order.
  if (WHATSAPP_NUMBER.trim()) {
    const number = WHATSAPP_NUMBER.replace(/\D/g, "");

    if (!number) {
      notify("Please configure a valid WhatsApp number in app.js.");
      return;
    }

    const whatsappUrl =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    return;
  }

  await copyOrderMessage(message);
}

function setupEventListeners() {
  if (grid) {
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add]");
      if (!button || button.disabled) return;

      addToCart(button.dataset.add);
    });
  }

  if (cartItems) {
    cartItems.addEventListener("click", (event) => {
      const button = event.target.closest("[data-qty]");
      if (!button || button.disabled) return;

      changeCartQuantity(
        button.dataset.qty,
        Number(button.dataset.delta)
      );
    });
  }

  search?.addEventListener("input", renderProducts);
  categoryFilter?.addEventListener("change", renderProducts);
  sort?.addEventListener("change", renderProducts);

  document.querySelector("#open-cart")
    ?.addEventListener("click", openCart);

  document.querySelector("#close-cart")
    ?.addEventListener("click", closeCart);

  overlay?.addEventListener("click", closeCart);

  document.querySelector("#checkout")
    ?.addEventListener("click", checkout);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
    }
  });

  const yearElement = document.querySelector("#year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

async function loadProducts() {
  if (!grid) return;

  try {
    const response = await fetch("products.json", {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error("The product catalogue could not be loaded.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The product catalogue must be a JSON array.");
    }

    products = data.filter(
      (product) =>
        product &&
        product.id !== undefined &&
        product.id !== null &&
        String(product.id).trim() !== "" &&
        typeof product.name === "string" &&
        product.name.trim() !== ""
    );

    const categories = [
      ...new Set(
        products
          .map((product) => String(product.category || "").trim())
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));

    if (categoryFilter) {
      categoryFilter.innerHTML = [
        '<option value="all">All categories</option>',
        ...categories.map(
          (category) =>
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
        )
      ].join("");
    }

    renderProducts();
    renderCart();

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state">
          Your product catalogue is empty. Add products to products.json to display them here.
        </div>
      `;
    }
  } catch (error) {
    console.error("ZAYBH catalogue error:", error);

    grid.innerHTML = `
      <div class="empty-state">
        We couldn't load the product catalogue. Please check that products.json exists, contains valid JSON, and is accessible through your website.
      </div>
    `;
  }
}

setupEventListeners();
renderCart();
loadProducts();
