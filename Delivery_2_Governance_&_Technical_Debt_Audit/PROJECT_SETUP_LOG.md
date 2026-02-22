# Project Setup & Fix Log — Vulnerable Node

> **Date:** 2025-02-21  
> **Project:** Vulnerable Node (cr0hn/vulnerable-node)  
> **Goal:** Analyze the repository, detect issues, update dependencies, and run locally.

---

## 1. Project Overview

A deliberately vulnerable Node.js/Express web application simulating a small shop, originally designed to test security source code analyzers. Uses EJS templates, PostgreSQL database, and Express.js.

---

## 2. Issues Detected

### 2.1 Severely Outdated Dependencies

All dependencies were pinned to 2015–2016 era versions:

| Package          | Old Version | Updated Version |
|------------------|-------------|-----------------|
| body-parser      | ~1.13.2     | ^1.20.2         |
| cookie-parser    | ~1.3.5      | ^1.4.6          |
| debug            | ~2.2.0      | ^4.3.4          |
| ejs              | ^2.4.2      | ^3.1.9          |
| express          | ~4.13.1     | ^4.18.2         |
| express-session  | ^1.13.0     | ^1.17.3         |
| log4js           | ^0.6.36     | ^6.9.1          |
| morgan           | ~1.6.1      | ^1.10.0         |
| pg-promise       | ^4.4.6      | ^11.5.4         |
| serve-favicon    | ~2.3.0      | ^2.5.0          |

### 2.2 Deprecated Package: `ejs-locals`

- `ejs-locals` (v1.0.2) has been abandoned for over 10 years and is incompatible with EJS 3.x.
- **Replaced with** `express-ejs-layouts` (^2.5.1), a modern and maintained alternative.

### 2.3 Incompatible `log4js` API (Breaking Change)

The code used log4js v0.6.x API methods that were completely removed in v1+:

```javascript
// OLD (broken with log4js >= 1.0)
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('app-custom.log'), 'vnode');
logger4js.setLevel('INFO');
```

**Fixed to modern log4js v6.x API:**

```javascript
log4js.configure({
  appenders: {
    file: { type: 'file', filename: 'app-custom.log' }
  },
  categories: {
    default: { appenders: ['file'], level: 'info' },
    vnode: { appenders: ['file'], level: 'info' }
  }
});
var logger4js = log4js.getLogger('vnode');
```

### 2.4 Deprecated `bodyParser()` Call

```javascript
// OLD — deprecated since Express 4.x
app.use(bodyParser());

// FIXED — removed, kept only the explicit parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
```

### 2.5 Wrong Default Config Environment

`config.js` defaulted to `DEVEL` (remote IP `10.211.55.70`) instead of `LOCAL` (`127.0.0.1`), making local development impossible without setting `STAGE=LOCAL`.

```javascript
// OLD
default: config = config_devel;

// FIXED
default: config = config_local;
```

### 2.6 JavaScript Typo in `layout.ejs`

```javascript
// OLD — trailing 'd' causes runtime error
wall.fitWidth();d

// FIXED
wall.fitWidth();
```

---

## 3. View Template Restructuring

The project used `ejs-locals`' proprietary `<% layout('name') %>` syntax for nested layouts. This was replaced with `express-ejs-layouts` middleware.

### Changes Made:

1. **Merged `layout.ejs` + `content.ejs`** into a single `layout.ejs` containing the full HTML structure (head, navbar, body placeholder, scripts).

2. **Created `layout-login.ejs`** — a minimal layout (HTML head + body, no navbar) for the login and error pages.

3. **Removed `<% layout('...') %>`** calls from all 5 view templates:
   - `login.ejs` — removed `<% layout('layout') %>`
   - `products.ejs` — removed `<% layout('content') %>`
   - `product_detail.ejs` — removed `<% layout('content') %>`
   - `search.ejs` — removed `<% layout('content') %>`
   - `bought_products.ejs` — removed `<% layout('content') %>`

4. **Updated `app.js`:**
   ```javascript
   var expressLayouts = require('express-ejs-layouts');
   app.use(expressLayouts);
   app.set('layout', 'layout'); // default layout with navbar
   ```

5. **Updated route/error render calls** to specify `layout-login` where needed:
   - `routes/login.js`: `res.render('login', { layout: 'layout-login', ... })`
   - `app.js` error handlers: `res.render('error', { layout: 'layout-login', ... })`

---

## 4. Files Modified

| File | Action |
|------|--------|
| `package.json` | Updated all dependency versions; replaced `ejs-locals` with `express-ejs-layouts` |
| `app.js` | Replaced `ejs-locals` engine with `express-ejs-layouts`; fixed log4js API; removed deprecated `bodyParser()` call; added layout to error handlers |
| `config.js` | Changed default config from `config_devel` to `config_local` |
| `views/layout.ejs` | Merged with `content.ejs` (navbar + container); fixed JS typo (`wall.fitWidth();d`) |
| `views/layout-login.ejs` | **Created** — minimal layout for login/error pages |
| `views/login.ejs` | Removed `<% layout('layout') %>` |
| `views/products.ejs` | Removed `<% layout('content') %>` |
| `views/product_detail.ejs` | Removed `<% layout('content') %>` |
| `views/search.ejs` | Removed `<% layout('content') %>` |
| `views/bought_products.ejs` | Removed `<% layout('content') %>` |
| `routes/login.js` | Added `layout: 'layout-login'` to login render call |

---

## 5. Steps to Run Locally

### Prerequisites
- **Node.js** (v16+ recommended)
- **Docker** (for PostgreSQL database)

### Commands

```bash
# 1. Start PostgreSQL via Docker Compose (only the database)
docker compose up -d postgres_db

# 2. Install Node.js dependencies
npm install

# 3. Set the environment variable and start the app
#    On Windows (PowerShell):
$env:STAGE = "LOCAL"
node ./bin/www

#    On Linux/macOS:
STAGE=LOCAL node ./bin/www
```

### Access

- **URL:** http://localhost:3000
- **Credentials:**
  - `admin` / `admin`
  - `roberto` / `asdfpiuw981`

---

## 6. Verification Results

| Check | Result |
|-------|--------|
| `npm install` | ✅ 129 packages installed successfully |
| `GET /login` | ✅ HTTP 200 — Login page renders |
| `GET /` | ✅ HTTP 302 — Redirects to `/login` (auth required) |
| `POST /login/auth` (admin/admin) | ✅ HTTP 200 — Dashboard loads with products from DB |
| Database connectivity | ✅ PostgreSQL connection successful, tables auto-created |

---

## 7. Known Remaining Warnings

- `npm audit` reports 4 high-severity vulnerabilities in transitive dependencies. This is expected for a **deliberately vulnerable** application and is part of its design purpose.
- The `content.ejs` file is now unused (its content was merged into `layout.ejs`) and can be safely deleted.
