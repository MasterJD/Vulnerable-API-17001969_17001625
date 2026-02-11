# USER_STORIES.md

## Backlog Recovery

### Epics: Identity, Catalog, Purchasing

#### Story 1: User Login
**As a** Customer,
**I can** log in to the application using my username and password,
**So that** I can access restricted features like purchasing items.
* **Code Evidence:** `routes/login.js` -> `router.post('/login/auth', ...)`
* **Supporting Logic:** `model/auth.js` -> `do_auth()` executes the SQL lookup.

#### Story 2: User Logout
**As a** Logged-in Customer,
**I can** log out of my session,
**So that** my account remains secure on shared devices.
* **Code Evidence:** `routes/login.js` -> `router.get('/logout', ...)`

#### Story 3: Browse Product Catalog
**As a** Customer,
**I can** view a list of all available products,
**So that** I can see what is for sale.
* **Code Evidence:** `routes/products.js` -> `router.get('/', ...)`
* **Supporting Logic:** `model/products.js` -> `list_products()`

#### Story 4: View Product Details
**As a** Customer,
**I can** click on a specific product to see its details,
**So that** I can make an informed buying decision.
* **Code Evidence:** `routes/products.js` -> `router.get('/products/detail', ...)`
* **Supporting Logic:** `model/products.js` -> `getProduct(product_id)`

#### Story 5: Search Products
**As a** Customer,
**I can** search for products by name or description,
**So that** I can find specific items quickly.
* **Code Evidence:** `routes/products.js` -> `router.get('/products/search', ...)`
* **Supporting Logic:** `model/products.js` -> `search(query)`

#### Story 6: Purchase Product
**As a** Logged-in Customer,
**I can** submit a purchase form with my shipping details,
**So that** I can order an item.
* **Code Evidence:** `routes/products.js` -> `router.all('/products/buy', ...)` (Note: Handles both GET and POST, likely legacy behavior).
* **Supporting Logic:** `model/products.js` -> `purchase(cart)`

#### Story 7: View Purchase History
**As a** Logged-in Customer,
**I can** view a list of products I have previously bought,
**So that** I can track my orders.
* **Code Evidence:** `routes/products.js` -> `router.get('/products/purchased', ...)`
* **Supporting Logic:** `model/products.js` -> `get_purcharsed(username)`