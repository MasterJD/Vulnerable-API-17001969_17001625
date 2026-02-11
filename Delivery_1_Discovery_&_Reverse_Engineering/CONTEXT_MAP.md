# CONTEXT_MAP.md

## Domain Analysis & Architecture

### 1. Bounded Contexts

Based on the file structure and logic, the application is divided into three primary (but entangled) contexts:

* **Identity & Access Management (IAM):**
    * **Responsibilities:** User authentication, session management, and access control.
    * **Files:** `routes/login.js`, `routes/login_check.js`, `model/auth.js`.
    * **Reasoning:** These files exclusively handle login flows, session validation, and user verification against the database.

* **Product Catalog:**
    * **Responsibilities:** Displaying products, searching, and viewing details.
    * **Files:** `routes/products.js` (read methods), `model/products.js` (read methods).
    * **Reasoning:** The "Browsing" capability is distinct from the "Buying" capability, though currently mixed in the same files.

* **Order Management (Sales):**
    * **Responsibilities:** processing purchases, recording transaction details.
    * **Files:** `routes/products.js` (`/buy` endpoint), `model/products.js` (`purchase` method), `model/init_db.js` (Schema definition for `purchases`).
    * **Reasoning:** This represents the transactional side of the business.

### 2. Coupling Analysis (Leaky Abstractions)

* **The "Product" God-Object:** `model/products.js` is a clear violation of Single Responsibility Principle. It handles:
    1.  Fetching product reference data (Catalog).
    2.  Executing financial transactions/orders (Sales).
    3.  Searching (Search).
* **Controller Logic Leakage:** `routes/products.js` contains significant business logic, specifically in the `/buy` endpoint. It performs validation on email formats and cart structure directly in the HTTP route handler rather than delegating to a domain service or validator.
* **Infrastructure Leakage:** SQL queries are hardcoded directly into the model functions (`model/products.js`). The database schema is defined in JavaScript (`model/init_db.js`) rather than migration files, coupling the app runtime to schema management.

### 3. Context Map (Mermaid)

<pre class="mermaid">
graph TD
    subgraph "Web Layer (Express)"
        AuthRoute[routes/login.js]
        ProductRoute[routes/products.js]
    end

    subgraph "Domain/Data Layer"
        AuthModel[model/auth.js]
        ProductModel[model/products.js]
        InitDB[model/init_db.js]
    end

    subgraph "Infrastructure"
        Postgres[(PostgreSQL)]
        Config[config.js]
    end

    %% Relationships
    AuthRoute -->|Uses| AuthModel
    ProductRoute -->|Browsing| ProductModel
    ProductRoute -->|Buying| ProductModel
    
    AuthModel -->|SQL| Postgres
    ProductModel -->|SQL| Postgres
    InitDB -->|DDL/Seed| Postgres

    %% Cross-Cutting
    AuthRoute -.->|Reads| Config
    ProductModel -.->|Reads| Config
</pre>