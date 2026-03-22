# Delivery 4: Architecture Strategy & DevEx

## Leadership, ADRs & Platform Engineering

**Project:** Vulnerable Node (vulnerable-node-source)  
**Scope:** One-Command Setup + Strategic RFC/ADR

---

## 1. Executive Summary

This delivery introduces platform-level developer experience improvements and a strategic architecture decision document (ADR/RFC):

1. **One-Command Setup** was implemented through a platform script so the full environment can be started without manual intervention.
2. A formal **ADR (RFC format)** was created proposing a major architecture evolution path, with explicit trade-offs, risks, and cost framing.
3. The proposal is supported by existing codebase evidence from Deliveries 1, 2, and 3 (complexity, coupling, security debt, governance maturity).

---

## 2. One-Command Setup (<5 min)

### 2.1 Existing Infrastructure (What already existed)

The repository already had a `docker-compose.yml` with:

- `vulnerable_node` service (Node.js app)
- `postgres_db` service (PostgreSQL)
- healthcheck for PostgreSQL (`pg_isready`)
- app dependency on DB health (`depends_on.condition: service_healthy`)

This already provided container orchestration, but not a complete no-manual-step onboarding flow due to legacy DB initialization behavior.

### 2.2 DevEx Improvement Implemented

A platform script was added:

- `scripts/devex-up.js`

And exposed via npm scripts:

- `npm run devex:up`
- `npm run devex:down`

### 2.3 What `npm run devex:up` does

Single command flow:

1. Detects whether `docker compose` or `docker-compose` is available.
2. Runs `compose up -d --build`.
3. Waits for `postgres_db` to become healthy.
4. Restarts `vulnerable_node` once to finalize seeded demo data in the current legacy init flow.
5. Prints final URL and credentials.

This removes the need for manual multi-step bootstrapping and standardizes onboarding.

### 2.4 Usage

```bash
npm run devex:up
```

Stop environment:

```bash
npm run devex:down
```

### 2.5 Why this satisfies the rubric

- **Single command:** yes (`npm run devex:up`)
- **No manual steps:** yes (DB wait + one-time restart is automated)
- **Spin-up target:** designed for local startup under 5 minutes in typical laptop Docker setups

---

## 3. Strategic RFC / ADR

## ADR-004: Refactor to Component-Based Modular Monolith

**Status:** Proposed  
**Authors:** Team 17001969 / 17001625

### 3.1 Context

Current state (from Deliveries 1-3):

- The system is deployed as a monolith and must keep that deployment model.
- Domain boundaries are identified (IAM, Catalog, Sales), but implementation still has coupling hotspots.
- Delivery 2 shows governance maturity and test safety:
  - Coverage: **98.38% statements**, **85.71% branches**
  - Max cyclomatic complexity: **7** (threshold 10)
- Delivery 3 improved supply-chain security and DevSecOps baseline (SBOM, Trivy, pre-commit secret checks, CI security workflow).

Leadership problem statement:

- Improve maintainability, team autonomy, and change safety without moving to microservices.
- Formalize a refactoring strategy that keeps a single deployable unit but enforces internal modular boundaries.

### 3.2 Decision

Adopt an **incremental refactor to a component-based modular monolith** with three internal modules:

1. **IAM Component** (authentication, session, access control)
2. **Catalog Component** (product listing, search, detail)
3. **Sales Component** (purchase workflow, order history)

Refactoring principles:

- Keep **one deployable monolith**.
- Define clear component boundaries (controller/service/repository per domain).
- Interact via explicit internal interfaces (no direct cross-component DB query leakage).
- No big-bang rewrite; migrate route-by-route using Strangler inside the monolith.
- Preserve backward compatibility and existing HTTP contracts during migration.

### 3.3 Considered Options

1. **Option A: Keep current monolith as-is (minimal fixes only).**
2. **Option B: Migrate to microservices.**
3. **Option C: Refactor to modular monolith by components (chosen).**

### 3.4 Decision Drivers (Data/Patterns)

- **Bounded context evidence:** Delivery 1 context map already separates IAM, Catalog, and Sales conceptually.
- **Governance readiness:** Delivery 2 quality gates and coverage provide regression protection for incremental refactoring.
- **Security maturity:** Delivery 3 controls reduce risk while changing internals.
- **Cost/risk balance:** Modular monolith reduces coupling without introducing distributed-system complexity.

### 3.5 Trade-offs

Benefits:

- Better separation of concerns with lower internal coupling.
- Faster local development than distributed services.
- Simpler operations (single deployment, single runtime topology).
- Stronger team ownership by component without infra overhead.

Costs/downsides:

- No independent runtime scaling per component.
- Shared process means noisy-neighbor risk between modules.
- Requires disciplined boundary governance to avoid regression to a "big ball of mud".

### 3.6 Risks

1. **Boundary erosion risk:** components may start importing each other directly.
2. **Refactor fatigue risk:** incremental plan may stall mid-way.
3. **Regression risk:** behavior drift during extraction from legacy route/model files.
4. **Governance drift risk:** standards may be applied inconsistently.

### 3.7 Mitigations

- Enforce architecture rules in code review (component boundary checklist).
- Add explicit folder/module contracts (`controllers/`, `services/`, `repositories/` per component).
- Keep existing CI gates and expand with architecture linting rules over time.
- Migrate in small vertical slices with tests before and after each cutover.

### 3.8 Cost Estimate (Order of Magnitude)

People/Time estimate for the first refactor wave:

- IAM component extraction inside monolith: **1-2 weeks**
- Catalog component extraction: **1-2 weeks**
- Sales component extraction: **2-3 weeks**
- Shared architecture standards/tests hardening: **1-2 weeks**
- Total first wave: **5-9 weeks** (team-capacity dependent)

Infra cost impact:

- Minimal increase vs current baseline (same deployment topology).
- Main cost is engineering time, not platform expansion.

### 3.9 Consequences

Short-term:

- Refactor workstream runs in parallel with feature delivery.
- Team needs clear coding standards per component boundary.

Medium-term:

- Reduced coupling and safer code changes inside each domain component.
- Improved onboarding because module responsibilities are explicit.

Long-term:

- Sustainable modular architecture while preserving monolith operational simplicity.
- Clear future optionality: remain modular monolith or extract services later if data justifies it.

### 3.10 Non-Goals

- No migration to microservices in this phase.
- No big-bang rewrite.
- No changes to external API contracts as part of architectural cleanup.

---

## 4. Platform Engineering Notes

This delivery introduces a lightweight platform entrypoint for local environments:

- `scripts/devex-up.js` as standardized bootstrap automation
- npm entrypoints for lifecycle consistency:
  - `devex:up`
  - `devex:down`

This pattern can be reused in future for:

- local health checks
- smoke tests after startup
- automatic seed/migration orchestration
- environment conformance checks

---

## 5. Mini-Rubric Validation

- [x] Environment spins up with a single command without manual steps.  
  Evidence: `npm run devex:up` automates compose up, DB health wait, and app restart workaround.

- [x] ADR follows a standard RFC format (Context, Decision, Consequences).  
  Evidence: ADR-004 includes Context, Decision, Trade-offs, Risks, Costs, Consequences.

- [x] ADR arguments are backed by data/patterns, not just opinion.  
  Evidence: Uses Delivery 1 context boundaries, Delivery 2 metrics (coverage/complexity), and Delivery 3 security/governance maturity.

---

## 6. Commands Reference

```bash
# One-command full startup
npm run devex:up

# Stop environment
npm run devex:down

# Existing governance pipeline locally
npm run ci

# Existing security update
npm run security:update
```

---

## 7. Conclusion

Delivery 4 establishes a practical developer platform baseline (one-command setup) and an evidence-based architecture strategy centered on a **component-based modular monolith** refactor plan.
