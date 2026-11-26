# GreenBasket – Supermarket & Daily Grocery Store HTML Template

A modern, multi-page grocery shopping template built with **Bootstrap 5.3**, **HTML5**, **CSS3** and **vanilla JavaScript (ES6+)**. No frameworks and no build step.

> **Front-end demo.** Login, inventory, orders, payments, delivery tracking and the admin panel are *simulated in the browser* with `localStorage`. Nothing is sent to a server and no payment is taken. Connect a backend/API before using it as a live store. See `documentation/index.html`, sections 12–14.

## Quick start

1. Unzip the package.
2. Run a local server from the folder (recommended), or open `index.html` directly:
   ```bash
   npx serve .            # or: python -m http.server 8080
   ```
3. Read the full guide in **`documentation/index.html`**.

Bootstrap, Bootstrap Icons, Chart.js and Google Fonts load from CDNs. Product photos are hot-linked from Unsplash. If an image can't load, `assets/images/placeholder.svg` is shown in its place.

## What's included

| Area | Pages |
|---|---|
| Storefront | Home 1, Home 2, About, Shop, Product details, Cart, Checkout, Order confirmation, Delivery info, Membership plans, Blog, Blog details, Contact, Login, Register, Wishlist, Order tracking, 404, Coming soon |
| Customer area (`customer/`) | Dashboard, Orders, Shopping lists, Addresses, Profile |
| Admin panel (`admin/`) | Login, Dashboard (Chart.js), Products, Categories, Orders, Customers, Delivery, Messages, Reports, Settings |

**Features:** product search, filters, sorting, grid/list view and pagination · cart with coupons and a free-delivery progress bar · wishlist · shopping lists (add a whole list to the cart) · checkout validation with delivery slots and payment placeholders (Stripe, PayPal, UPI) · order tracking timeline · light/dark mode (follows the OS setting, choice is saved) · RTL for Arabic and Hebrew · currency switcher (demo rates) · toasts, modals and loading skeletons · accessible forms · SEO meta, Open Graph tags, JSON-LD, `sitemap.xml` and `robots.txt`.

## Demo data to try

- **Coupons:** `FRESH10` (10% off, up to ₹150), `WELCOME50` (₹50 off orders over ₹299)
- **Tracking:** `GB10482` (out for delivery), `GB10418` (packed), `GB10457` (delivered). Any order you place in the demo checkout can also be tracked.
- **Admin login:** `admin@greenbasket.demo` / `admin123`
- **Reset demo data:** clear site data in your browser. All keys start with `gb-`.

## Customise

- **Colours and fonts:** CSS variables at the top of `assets/css/style.css`. Dark-mode values are in `dark-mode.css`.
- **Products and categories:** `assets/js/products.js`
- **Delivery fee, free-delivery threshold and coupons:** `GB.rules` in `assets/js/cart.js`
- **Before publishing:** replace `https://www.example.com/` with your domain in every page, `sitemap.xml` and `robots.txt`.

## Credits

Bootstrap & Bootstrap Icons (MIT) · Chart.js (MIT) · Poppins & Inter (SIL OFL) · Photos from Unsplash (Unsplash License). Brands, people and reviews in the demo are fictional.

Version 1.0.0 · November 2026
