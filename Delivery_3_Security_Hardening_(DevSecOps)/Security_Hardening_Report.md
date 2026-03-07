# Delivery 3: Security Hardening (DevSecOps)

## Security Hardening Report

**Project:** Vulnerable Node (cr0hn/vulnerable-node)  
**Date:** 2026-03-07  
**Authors:** Team 17001969 / 17001625

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Compliance](#2-architecture-compliance)
3. [Task 1: SBOM Generation](#3-task-1-sbom-generation)
4. [Task 2: Vulnerability Scanning and Patching](#4-task-2-vulnerability-scanning-and-patching)
5. [Task 3: Secret Protection (Pre-Commit Hook)](#5-task-3-secret-protection-pre-commit-hook)
6. [CI/CD Security Integration](#6-cicd-security-integration)
7. [Developer Guide: Running Security Tools](#7-developer-guide-running-security-tools)
8. [Artifacts Summary](#8-artifacts-summary)

---

## 1. Overview

This delivery implements **Supply Chain Security Hardening** for the Vulnerable Node application, building upon the findings from Delivery 1 (Discovery & Reverse Engineering) and Delivery 2 (Governance & Technical Debt Audit).

The security hardening focuses on three pillars:

1. **Transparency** — Generating a Software Bill of Materials (SBOM) to enumerate all dependencies.
2. **Vulnerability Management** — Scanning for and patching dependency and code-level vulnerabilities.
3. **Prevention** — Installing pre-commit hooks to block accidental secret leaks.

All changes adhere to the **Monolithic but Modular Architecture** constraint. Security fixes are localized within their respective modules (`model/auth.js`, `model/products.js`), maintaining loose coupling and clear module boundaries. No cross-module coupling was introduced.

---

## 2. Architecture Compliance

### Modular Monolith Preservation

All security improvements were implemented respecting the existing module boundaries:

| Module | Change Type | Description |
|--------|-------------|-------------|
| `model/auth.js` | Secure refactoring | Parameterized SQL queries (localized to IAM module) |
| `model/products.js` | Secure refactoring | Parameterized SQL queries (localized to Catalog/Sales module) |
| `package.json` | Dependency update | `minimatch` vulnerability patched via `npm audit fix` |
| `.husky/pre-commit` | New infrastructure | Standalone pre-commit hook (no module coupling) |
| `security/` | New artifacts | SBOM and vulnerability reports (passive, no logic coupling) |
| `.github/workflows/` | CI extension | Parallel security pipeline (does not modify existing governance pipeline) |

**No microservices were introduced.** No tight coupling was created between modules. Each security fix remains self-contained within its respective bounded context, as described in the Delivery 1 Context Map.

---

## 3. Task 1: SBOM Generation

### What is an SBOM?

A Software Bill of Materials (SBOM) is a structured inventory of all software components (direct and transitive dependencies) used in the project. It enables supply chain transparency, license compliance auditing, and vulnerability tracking.

### Implementation

The SBOM is generated using **Trivy v0.69.3** in **CycloneDX JSON format**, which is an industry-standard format supported by OWASP and recognized by regulatory frameworks.

**Command used:**

```bash
trivy fs --format cyclonedx -o security/sbom.json .
```

**Output location:** `security/sbom.json`

### SBOM Contents

The generated SBOM catalogs all production dependencies of the project including:

- **Direct dependencies:** `express`, `pg-promise`, `ejs`, `express-session`, `body-parser`, `cookie-parser`, `log4js`, `morgan`, `serve-favicon`, `express-ejs-layouts`, `debug`
- **Transitive dependencies:** All nested sub-dependencies resolved from `package-lock.json`
- **Metadata:** Package versions, PURL identifiers, dependency relationships, license information

### Regeneration

To regenerate the SBOM (e.g., after adding new dependencies):

```bash
npm run security:sbom
```

This script is defined in `package.json` and executes the Trivy SBOM generation command.

### Automation

SBOM generation is automated in the CI/CD pipeline via `.github/workflows/security-scan.yml`. Every push and pull request triggers automatic SBOM generation. The SBOM is uploaded as a build artifact with 30-day retention.

---

## 4. Task 2: Vulnerability Scanning and Patching

### 4.1 Pre-Patch Vulnerability Scan

A Trivy vulnerability scan was performed **before** applying any fixes. The scan identified **3 HIGH severity vulnerabilities** in the `minimatch` dependency:

| CVE | Severity | Package | Installed | Fixed In | Description |
|-----|----------|---------|-----------|----------|-------------|
| CVE-2026-26996 | HIGH | minimatch | 5.1.6 | 5.1.7+ | Denial of Service via specially crafted glob patterns |
| CVE-2026-27903 | HIGH | minimatch | 5.1.6 | 5.1.8+ | Denial of Service due to unbounded recursive backtracking via crafted glob patterns |
| CVE-2026-27904 | HIGH | minimatch | 5.1.6 | 5.1.8+ | Denial of Service via catastrophic backtracking in glob expressions |

All three vulnerabilities are **ReDoS (Regular Expression Denial of Service)** attacks that could cause the application or its build tools to hang when processing malicious glob patterns.

**Full pre-patch report:** `security/reports/vuln-before.json`

### 4.2 Code-Level Security Hotspots

In addition to the dependency vulnerability, two critical code-level security hotspots were identified in Delivery 2's Technical Debt Audit:

1. **SQL Injection in `model/auth.js`** (CWE-89) — Authentication bypass via string concatenation
2. **SQL Injection in `model/products.js`** (CWE-89) — Data exfiltration and manipulation via string concatenation in 4 functions

These were flagged in `scanner/sast/expectedIssues.csv` as CWE-89 vulnerabilities at lines 9 (auth.js), 16, 23, and 40 (products.js).

### 4.3 Patches Applied

#### Patch 1: Dependency Update (minimatch)

**Action:** `npm audit fix`

**Result:** All 3 HIGH severity `minimatch` CVEs were resolved by updating to a patched version. The `package-lock.json` was updated automatically.

#### Patch 2: SQL Injection Fix in `model/auth.js` (IAM Module)

**Vulnerability:** CWE-89 — SQL Injection allowing authentication bypass.

**Before (vulnerable):**
```javascript
function do_auth(username, password) {
    var db = pgp(config.db.connectionString);
    var q = "SELECT * FROM users WHERE name = '" + username + "' AND password ='" + password + "';";
    return db.one(q);
}
```

An attacker could inject `admin' OR '1'='1` as the username to bypass authentication entirely.

**After (secure):**
```javascript
function do_auth(username, password) {
    var db = pgp(config.db.connectionString);
    var q = "SELECT * FROM users WHERE name = $1 AND password = $2;";
    return db.one(q, [username, password]);
}
```

The fix uses **pg-promise parameterized queries** (`$1`, `$2` placeholders). User input is never concatenated into the SQL string. Parameters are passed as a separate array, preventing any SQL injection.

**Scope:** Localized to `model/auth.js` (IAM bounded context). No other modules were affected.

#### Patch 3: SQL Injection Fix in `model/products.js` (Catalog/Sales Module)

**Vulnerability:** CWE-89 — SQL Injection in 4 functions: `getProduct()`, `search()`, `purchase()`, `get_purcharsed()`.

**Before (vulnerable — example from `search()`):**
```javascript
function search(query) {
    var q = "SELECT * FROM products WHERE name ILIKE '%" + query + "%' OR description ILIKE '%" + query + "%';";
    return db.many(q);
}
```

**After (secure):**
```javascript
function search(query) {
    var q = "SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1;";
    return db.many(q, ['%' + query + '%']);
}
```

All four functions in `model/products.js` were refactored to use parameterized queries:

| Function | Parameters | Description |
|----------|------------|-------------|
| `getProduct(product_id)` | `$1` = product_id | Product lookup by ID |
| `search(query)` | `$1` = '%' + query + '%' | Product search with ILIKE |
| `purchase(cart)` | `$1`–`$8` = cart fields | Purchase insertion |
| `get_purcharsed(username)` | `$1` = username | Purchase history lookup |

**Scope:** Localized to `model/products.js` (Catalog/Sales bounded context). The `routes/products.js` handler was not modified — the module interface (function signatures and return types) was preserved.

### 4.4 Post-Patch Vulnerability Scan

After applying all patches, a second Trivy scan confirmed **0 vulnerabilities**:

```
Report Summary
┌───────────────────┬──────┬─────────────────┐
│      Target       │ Type │ Vulnerabilities │
├───────────────────┼──────┼─────────────────┤
│ package-lock.json │ npm  │        0        │
└───────────────────┴──────┴─────────────────┘
```

**Full post-patch report:** `security/reports/vuln-after.json`

### 4.5 Test Suite Verification

All 55 tests in 7 test suites pass after the patches. The test assertions were updated to validate the new parameterized query pattern (e.g., checking for `$1`, `$2` placeholders and separate parameter arrays instead of inline values).

```
Test Suites: 7 passed, 7 total
Tests:       55 passed, 55 total
Statement coverage: 98.38%
```

### 4.6 Before vs. After Summary

| Metric | Before | After |
|--------|--------|-------|
| Dependency vulnerabilities (Trivy) | 3 HIGH | 0 |
| SQL injection points (CWE-89) | 5 locations | 0 |
| Test suite | All passing | All passing |
| Statement coverage | 98.38% | 98.38% |

---

## 5. Task 3: Secret Protection (Pre-Commit Hook)

### Purpose

Prevent accidental commits of hardcoded secrets (API keys, tokens, passwords, private keys) into the repository. This is a critical supply chain security control that catches secrets before they enter version control history.

### Implementation

**Tool:** Husky v9 (Git hooks manager for Node.js projects)

**Installation:**
```bash
npm install --save-dev husky
npx husky init
```

**Hook location:** `.husky/pre-commit`

### How It Works

The pre-commit hook executes automatically before every `git commit`. It:

1. Scans **only staged changes** (`git diff --cached`) — not the entire codebase
2. Searches for secret patterns using case-insensitive regex matching
3. **Blocks the commit** if any secret pattern is detected (exit code 1)
4. Displays a clear error message identifying the detected patterns

### Secret Patterns Detected

| Pattern | Example Match |
|---------|---------------|
| `API_KEY=` | `API_KEY=sk-abc123...` |
| `SECRET=` | `SECRET=my-secret-value` |
| `TOKEN=` | `TOKEN=ghp_xxxx...` |
| `PASSWORD=` | `PASSWORD=admin123` |
| `PRIVATE_KEY=` | `PRIVATE_KEY=-----BEGIN RSA...` |
| `AWS_ACCESS_KEY` | `AWS_ACCESS_KEY=AKIAIOSFODNN...` |
| `AWS_SECRET_KEY` | `AWS_SECRET_KEY=wJalrXUtnFEMI...` |
| `DB_PASSWORD=` | `DB_PASSWORD=postgres` |
| `SESSION_SECRET=` | `SESSION_SECRET=mysecret...` |

### Example Behavior

**When a secret is detected:**
```
Running pre-commit secret detection scan...

============================================================
  ERROR: Secret detected in staged files. Commit blocked.
============================================================

The following secret patterns were found in your staged changes:

+API_KEY=sk-1234567890abcdef

Please remove any hardcoded secrets before committing.
Use environment variables or a .env file instead.
```

**When no secrets are found:**
```
Running pre-commit secret detection scan...
No secrets detected. Proceeding with commit.
```

### Architecture Impact

The pre-commit hook is a **standalone infrastructure component** in the `.husky/` directory. It:
- Does not modify any application module
- Does not introduce dependencies between bounded contexts
- Runs in the developer's local Git environment only
- Has zero impact on application runtime behavior

---

## 6. CI/CD Security Integration

### Existing Pipeline

The repository already has a Governance CI pipeline (`.github/workflows/governance.yml`) that runs ESLint complexity checks and Jest coverage tests.

### New Security Pipeline

A new **parallel** CI workflow was added at `.github/workflows/security-scan.yml`. It runs alongside (not replacing) the governance pipeline.

**Triggers:** Every push to any branch and every pull request.

**Pipeline Steps:**

| Step | Action | Purpose |
|------|--------|---------|
| 1 | Checkout code | Get source code |
| 2 | Setup Node.js 22 | Runtime environment |
| 3 | `npm ci` | Install locked dependencies |
| 4 | Install Trivy | Security scanner |
| 5 | Generate SBOM | `trivy fs --format cyclonedx -o security/sbom.json .` |
| 6 | Vulnerability scan | `trivy fs --scanners vuln --format json` + table |
| 7 | Security gate | `trivy fs --exit-code 1 --severity HIGH,CRITICAL` — **fails build** if HIGH/CRITICAL vulns found |
| 8 | Upload SBOM artifact | 30-day retention |
| 9 | Upload vuln report artifact | 30-day retention |

### Security Gate

Step 7 acts as a **quality gate**: if Trivy finds any HIGH or CRITICAL vulnerability in the dependency tree, the build fails with exit code 1. This prevents merging pull requests that introduce vulnerable dependencies.

### Integration with Existing Pipeline

The security pipeline is fully independent from the governance pipeline:
- Different workflow file, different job name
- No shared state or artifacts between pipelines
- Both pipelines run in parallel on the same triggers
- Failure in one pipeline does not affect the other

---

## 7. Developer Guide: Running Security Tools

### Prerequisites

- **Node.js 22+** installed
- **Trivy** installed ([installation guide](https://aquasecurity.github.io/trivy/latest/getting-started/installation/))
- **Git** configured (for Husky hooks)

### After Cloning

```bash
npm install          # Installs dependencies + sets up Husky hooks automatically
```

The `prepare` script in `package.json` runs `husky` on `npm install`, configuring Git hooks automatically.

### Available Security Commands

| Command | Description |
|---------|-------------|
| `npm run security:sbom` | Generate SBOM in CycloneDX format → `security/sbom.json` |
| `npm run security:scan` | Run Trivy vulnerability scan (table output to console) |
| `npm run security:scan:json` | Run Trivy scan with JSON report → `security/reports/vuln-latest.json` |
| `npm audit` | Run npm's built-in audit (alternative to Trivy for dependency-only checks) |

### Regenerating Reports

**SBOM:**
```bash
npm run security:sbom
```

**Vulnerability scan:**
```bash
npm run security:scan           # Human-readable table
npm run security:scan:json      # Machine-readable JSON
```

### Bypassing the Pre-Commit Hook

In exceptional cases (e.g., committing a test fixture that intentionally contains a pattern), you can bypass the hook:

```bash
git commit --no-verify -m "your message"
```

**Warning:** This should only be used in justified situations. All bypasses should be documented in the commit message.

---

## 8. Artifacts Summary

| Artifact | Path | Description |
|----------|------|-------------|
| SBOM | `security/sbom.json` | CycloneDX JSON Software Bill of Materials |
| Pre-patch vulnerability report | `security/reports/vuln-before.json` | Trivy scan showing 3 HIGH vulnerabilities |
| Post-patch vulnerability report | `security/reports/vuln-after.json` | Trivy scan showing 0 vulnerabilities |
| Pre-commit hook | `.husky/pre-commit` | Secret detection hook blocking sensitive patterns |
| Security CI workflow | `.github/workflows/security-scan.yml` | Automated Trivy scanning and SBOM generation |
| This documentation | `Delivery_3_Security_Hardening_(DevSecOps)/Security_Hardening_Report.md` | Technical report |

### Files Modified

| File | Change |
|------|--------|
| `model/auth.js` | SQL injection fix — parameterized queries |
| `model/products.js` | SQL injection fix — parameterized queries (4 functions) |
| `package.json` | Added Husky, security scripts |
| `package-lock.json` | minimatch updated, Husky added |
| `__tests__/auth.test.js` | Updated assertions for parameterized queries |
| `__tests__/products-model.test.js` | Updated assertions for parameterized queries |

### Files Created

| File | Purpose |
|------|---------|
| `security/sbom.json` | SBOM artifact |
| `security/reports/vuln-before.json` | Pre-patch vulnerability report |
| `security/reports/vuln-after.json` | Post-patch vulnerability report |
| `.husky/pre-commit` | Secret detection pre-commit hook |
| `.github/workflows/security-scan.yml` | Security CI pipeline |
| `Delivery_3_Security_Hardening_(DevSecOps)/Security_Hardening_Report.md` | This document |
