# ZAYBH e-commerce starter

This is a custom-coded, responsive storefront starter. It is not yet a production-ready ecommerce backend.

## Included
- Responsive home page and brand styling
- Product catalogue loaded from `products.json` (add as many products as you want)
- Search, category filters and sorting
- Shopping bag/cart with quantity controls
- Demo order enquiry flow
- Basic privacy and returns placeholder pages

## Preview locally
Because browsers can block loading `products.json` from a local file, run a small local server:
1. Install Python if needed.
2. Open a terminal in this folder.
3. Run `python -m http.server 8000`
4. Visit `http://localhost:8000`

## Add products
Edit `products.json`. Each product can have:
- `id`: unique identifier
- `name`: product name
- `category`: category label
- `price`: number in INR
- `tag`: optional small label
- `description`: product description
- `image`: image URL (leave empty for placeholder)
- `featured`: true or false

Duplicate the product objects to add 100+ products. Keep IDs unique.

## Before real sales
This is a front-end starter, not a complete secure online store. It does not securely store orders, manage inventory, send order emails, or process payments. Do not accept payments until a backend/order system and a compliant payment gateway are configured.
To enable WhatsApp enquiry, edit `app.js` and set `const number=""` to your WhatsApp number in international format without `+` or spaces, e.g. `919876543210`.

## Deploy free
You can deploy the static files to a static hosting service that offers a free tier and receive a free subdomain. Sign-up, usage limits and provider terms apply. A custom domain normally costs money. Upload the contents of this folder (not the ZIP itself) to your chosen static host.
