# Delivery 2: Governance and Technical Debt Audit

This document outlines the implemented quality strategy, governance pipeline, DORA metrics dashboard definition, and a specific refactoring plan targeting codebase hotspots based on the Strangler Fig pattern.

## 1. Governance Pipeline and Quality Gates

The Continuous Integration (CI) pipeline is configured to enforce strict code quality and governance constraints on every pull request and commit. The pipeline automates the tracking of metrics and ensures that any degradation in code quality fails the build before it can be merged.

### Quality Gates Implemented

1. Cyclomatic Complexity Gate (ESLint):
   - Threshold: Maximum allowed complexity is 10 independent code paths per function.
   - Behavior: The build fails with an exit code 1 if any function exceeds this limit. Currently, the highest complexity is 7, so the codebase passes the gate.
2. Code Coverage Gate (Jest):
   - Threshold: Minimum 80% coverage across statements, branches, functions, and lines.
   - Behavior: The build fails with an exit code 1 if coverage drops below the 80% mark. Current global statement coverage stands at 98.38%.

### CI Pipeline Workflow (GitHub Actions)

The workflow logic follows these automated steps for pull requests:

1. Checkout code and setup Node.js environment.
2. Install dependencies via clean install.
3. Run static analysis (complexity check). Fails immediately if the threshold is breached.
4. Run automated test suite with coverage report generation. Fails immediately if the coverage threshold is breached.
5. Generate and publish governance reports as build artifacts.

## 2. DORA Metrics Dashboard Strategy

To measure the DevOps and delivery performance of the project, the following four DORA metrics are defined and tracked in the engineering dashboard:

1. Deployment Frequency:
   - Measurement: Track how often code is successfully deployed to the primary environment.
   - Implementation: Count the number of successful pipeline executions that result in a deployment trigger.
   - Target Goal: Multiple deployments per week.

2. Lead Time for Changes:
   - Measurement: Track the time between a commit being pushed and it successfully passing the CI pipeline and reaching production.
   - Implementation: Measure the timestamp difference from the initial commit creation to the final successful deployment event.
   - Target Goal: Less than one day.

3. Change Failure Rate:
   - Measurement: Calculate the percentage of deployments causing a failure in production requiring remediation (rollback or hotfix).
   - Implementation: Track incidents or rollback events divided by total successful deployments.
   - Target Goal: Less than 15%.

4. Mean Time to Recovery (MTTR):
   - Measurement: Measure the average time it takes to restore service after a production failure or incident.
   - Implementation: Track time from an incident being flagged to the resolution timestamp.
   - Target Goal: Less than one hour.

## 3. Technical Debt Audit: Top 3 Hotspots

Based on the cyclomatic complexity report and project setup logs, three files have been identified as primary technical debt hotspots due to high churn, excessive anonymous function counts, and elevated complexity.

### Hotspot 1: routes/products.js

- Priority: High (Highest Risk and Impact)
- Current State: Contains 14 anonymous functions. It features the most complex function in the entire project with a cyclomatic complexity of 7.
- Specific Issue: High accumulation of anonymous functions makes unit testing difficult and increases cognitive load. Logic for routing, data fetching, and rendering are tightly coupled, which inflates the function count and complexity.
- Security Risks:
  - **SQL Injection (SQLi):** Parameters from URL queries (like `id` and `q`) and request bodies (like the `cart` in `/products/buy`) are passed to the database models without sanitization or parameterization, allowing arbitrary command execution on the database.
  - **Business Logic Flaw (Price Manipulation):** The `/products/buy` endpoint relies on client-provided pricing data (`params.price`) instead of verifying the true cost of an item from the database, allowing users to alter pricing arbitrarily.
  - **Cross-Site Scripting (XSS):** The search term provided in `/products/search` is reflected back to the view unescaped (`in_query: query`), producing a Reflected XSS vulnerability.
  - **Missing Integrity Checks:** The purchase endpoint accepts unvalidated and untrusted properties mapped directly into the database insertion flow.

### Hotspot 2: model/init_db.js

- Priority: Medium (Moderate Risk)
- Current State: Contains 11 anonymous functions.
- Specific Issue: Database initialization logic relies heavily on chained anonymous callbacks. This bloats the codebase file, makes error handling fragile, and increases the unnecessary amount of functions.
- Security Risks:
  - **Hardcoded Credentials:** The initialization sequence seeds the database with hardcoded, plain-text user credentials (`dummy.users`), creating a backdoor if these accounts reach production.
  - **Insecure Data Storage:** The `users` table schema stores passwords in plain text with a generic `VARCHAR(50)` limit, actively preventing the use of strong cryptographic password hashing algorithms like bcrypt or Argon2.

### Hotspot 3: routes/login.js and routes/login_check.js

- Priority: Medium (Moderate Risk)
- Current State: Combined, they contain 6 functions, with a maximum complexity of 3.
- Specific Issue: Authentication check logic is fragmented. Relying on anonymous inline functions for route protection reduces reusability and unnecessarily expands the codebase.
- Security Risks:
  - **SQL Injection (Authentication Bypass):** The login processor passes the raw `user` and `password` strings straight into the database query concatenation in `auth.js`. This allows attackers to bypass login screens entirely using basic SQLi payloads (e.g., `' OR 1=1--`).
  - **Open Redirect:** After a successful login, the application performs an unvalidated redirect to a user-controlled `returnurl` parameter (`res.redirect(returnurl)`), facilitating highly effective phishing campaigns.
  - **Information Exposure:** Database errors encountered during authentication failures are reflected directly into the URL `error` parameter string, potentially exposing sensitive backend topological details.

## 4. Refactoring Plan: Strangler Fig Pattern

To mitigate the technical debt safely without ceasing feature development, we will apply the Strangler Fig pattern. This avoids a complete rewrite by incrementally migrating logic to a new, decoupled architecture.

The main objectives are reducing the overall amount of functions, replacing anonymous functions with named routines, and decreasing function complexity.

### Phase 1: Establish the New Architecture (The Vine)

- Create a new directory structure: controllers/ and services/.
- Establish modern patterns using async/await and named functions, creating a clear separation of concerns (routing vs. domain logic).

### Phase 2: Strangling Database Initialization (model/init_db.js)

- Build a new services/DatabaseService.js module.
- Incrementally replace the 11 anonymous functions with a few named, distinct setup methods (e.g., initializeSchema, seedBasicData).
- Route the server startup to use the new service. Once confirmed stable, delete the old model/init_db.js file.

### Phase 3: Strangling Authentication (routes/login.js)

- Create controllers/AuthController.js and middlewares/AuthMiddleware.js.
- Extract the logic from login_check.js into a single, named middleware function to reduce function count.
- Intercept the /login routes using the new AuthController one endpoint at a time. Deprecate the old route files once traffic is fully migrated.

### Phase 4: Strangling the Monolith Route (routes/products.js)

- Create controllers/ProductController.js and services/ProductService.js.
- Target the highest complexity function (complexity 7) first: extract the complex nested conditional logic into smaller, single-purpose helper functions within the ProductService.
- Use the Express router to intercept specific product endpoints (e.g., GET /products) and direct them to the new controller, leaving the remaining routes on the legacy system.
- Consolidate the 14 anonymous functions into a smaller set of focused controller methods.
- Once all endpoints are intercepted and successfully processed by the new architecture, delete the legacy routes/products.js file.
