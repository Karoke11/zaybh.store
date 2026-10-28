
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

const productModal = document.querySelector("#product-modal");
const closeProductModalButton = document.querySelector("#close-product-modal");
const detailImage = document.querySelector("#detail-image");
const detailPlaceholder = document.querySelector("#detail-placeholder");
const detailCategory = document.querySelector("#detail-category");
const detailName = document.querySelector("#detail-name");
const detailPrice = document.querySelector("#detail-price");
const detailDescription = document.querySelector("#detail-description");
const detailAvailability = document.querySelector("#detail-availability");
const detailAddToBag = document.querySelector("#detail-add-to-bag");

let products = [];
let cart = {};
let toastTimer = null;
let activeDetailProductId = null;
let previousFocusElement = null;

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
  const placeholder = escapeHtml(
    (product.name || "Z").charAt(0).toUpperCase()
  );

  if (imageUrl) {
    return `
      <img
        loading="lazy"
        src="${escapeHtml(imageUrl)}"
        alt="${name}"
        onerror="this.hidden=true;this.nextElementSibling.hidden=false"
      >
      <span class="placeholder-art" hidden>${placeholder}</span>
    `;
  }

  return `<span class="placeholder-art">${placeholder}</span>`;
}

/* PRODUCT LIST */

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
          class="details-button"
          type="button"
          data-details="${escapeHtml(id)}"
          aria-label="View details for ${name}"
        >
          VIEW DETAILS ↗
        </button>

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

/* PRODUCT DETAILS POPUP */

function openProductDetails(id) {
  if (!productModal) {
    notify("Product details are not available on this page yet.");
    return;
  }

  const product = products.find(
    (item) => getProductId(item) === String(id)
  );

  if (!product) {
    notify("This product could not be found.");
    return;
  }

  activeDetailProductId = getProductId(product);
  previousFocusElement = document.activeElement;

  if (detailCategory) {
    detailCategory.textContent = product.category || "General";
  }

  if (detailName) {
    detailName.textContent = product.name || "Unnamed product";
  }

  if (detailPrice) {
    detailPrice.textContent = money(getProductPrice(product));
  }

  if (detailDescription) {
    detailDescription.textContent =
      product.description ||
      "More information about this product will be added soon.";
  }

  const available = isProductAvailable(product);

  if (detailAvailability) {
    detailAvailability.textContent = available
      ? "Availability: Available to enquire"
      : "Currently unavailable";

    detailAvailability.classList.toggle("is-available", available);
    detailAvailability.classList.toggle("is-unavailable", !available);
  }

  if (detailAddToBag) {
    detailAddToBag.disabled = !available;
    detailAddToBag.textContent = available
      ? "ADD TO BAG +"
      : "CURRENTLY UNAVAILABLE";
  }

  const imageUrl = getProductImageUrl(product.image);

  if (detailImage) {
    detailImage.onerror = () => {
      detailImage.hidden = true;

      if (detailPlaceholder) {
        detailPlaceholder.hidden = false;
      }
    };

    if (imageUrl) {
      detailImage.src = imageUrl;
      detailImage.alt = product.name || "Product image";
      detailImage.hidden = false;

      if (detailPlaceholder) {
        detailPlaceholder.hidden = true;
      }
    } else {
      detailImage.removeAttribute("src");
      detailImage.alt = "";
      detailImage.hidden = true;

      if (detailPlaceholder) {
        detailPlaceholder.textContent =
          (product.name || "Z").charAt(0).toUpperCase();
        detailPlaceholder.hidden = false;
      }
    }
  } else if (detailPlaceholder) {
    detailPlaceholder.textContent =
      (product.name || "Z").charAt(0).toUpperCase();
  }

  productModal.hidden = false;
  productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("product-modal-open");

  if (closeProductModalButton) {
    closeProductModalButton.focus();
  }
}

function closeProductDetails() {
  if (!productModal || productModal.hidden) return;

  productModal.hidden = true;
  productModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("product-modal-open");
  activeDetailProductId = null;

  if (
    previousFocusElement &&
    typeof previousFocusElement.focus === "function"
  ) {
    previousFocusElement.focus();
  }
}

/* SHOPPING BAG */

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

/* ORDER ENQUIRY */

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

/* EVENT LISTENERS */

function setupEventListeners() {
  if (grid) {
    grid.addEventListener("click", (event) => {
      const detailsButton = event.target.closest("[data-details]");

      if (detailsButton) {
        openProductDetails(detailsButton.dataset.details);
        return;
      }

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

  closeProductModalButton?.addEventListener(
    "click",
    closeProductDetails
  );

  productModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-details]")) {
      closeProductDetails();
    }
  });

  detailAddToBag?.addEventListener("click", () => {
    if (activeDetailProductId === null) return;

    const product = products.find(
      (item) => getProductId(item) === String(activeDetailProductId)
    );

    if (!product || !isProductAvailable(product)) {
      notify("This product is currently unavailable.");
      return;
    }

    addToCart(activeDetailProductId);
    closeProductDetails();
    openCart();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      closeProductDetails();
    }
  });

  const yearElement = document.querySelector("#year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

/* LOAD PRODUCT CATALOGUE */

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
