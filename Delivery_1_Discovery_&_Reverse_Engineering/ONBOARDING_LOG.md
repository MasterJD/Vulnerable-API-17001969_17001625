# ONBOARDING_LOG.md

## DevEx Audit & Onboarding Experience

### 1. Environment Audit
* **Dependency Management:** The `package.json` lists very old dependencies (e.g., `express ~4.13.1`, `pg-promise ^4.4.6`). The use of tilde `~` and caret `^` with such old major versions suggests significant potential for breaking changes if a fresh `npm install` pulls in patches that have drifted over years.
* **Containerization:**
    * The `Dockerfile` uses `node:19.4.0-bullseye-slim`, which is relatively modern compared to the dependencies. This mismtach (old code, new runtime) could introduce subtle bugs.
    * It installs `netcat`, likely for a health-check script that isn't immediately visible or is intended for manual debugging.
    * `docker-compose.yml` defines a standard `postgres` service but hardcodes passwords (`postgres:postgres`), which is classic non-prod behavior leaking into configuration.
* **Configuration:**
    * `config.js` is a major pain point. It switches configuration based on a `STAGE` environment variable.
    * **CRITICAL BLOCKER:** The default case in `config.js` falls back to `config_devel`, which points to a specific hardcoded IP `10.211.55.70`. A new developer trying to run this locally without setting `STAGE="LOCAL"` or `"DOCKER"` will experience immediate connection timeouts.

### 2. Friction Points (Time-to-Hello-World)
* **Hardcoded Secrets:** `app.js` contains a hardcoded session secret: `'ñasddfilhpaf78h78032h780g780fg780asg780dsbovncubuyvqy'`. This poses a security risk and makes environment rotation impossible without code changes.
* **Data Volatility:** `app.js` calls `init_db()` on **every startup**. `model/init_db.js` attempts to `CREATE TABLE`s. If they exist, it might fail or behave unpredictably depending on `pg-promise` error handling (it catches errors but swallows them in some places). This makes testing data persistence nearly impossible as the app tries to reset state on boot.
* **Implicit Dependencies:** The application logs to a file `app-custom.log` using `log4js`. If the container user doesn't have write permissions to the app directory (though `Dockerfile` sets `WORKDIR /app` and runs as root by default), this will crash.

### 3. Severity Assessment: **HIGH**
* **Justification:** The application is not "clone-and-run" friendly. The default configuration points to an unreachable private IP address (`10.211.55.70`). The aggressive database initialization logic risks data loss or startup crashes. The dependency tree is severely outdated, inviting security vulnerabilities and compatibility issues with modern Node.js versions.

### 4. Quick Wins
1.  **Fix Config Defaults:** Change `config.js` default case to use `127.0.0.1` or throw a clear error if `STAGE` is missing, rather than failing silently on a timeout to a private IP.
2.  **Externalize Secrets:** Move the session secret and database credentials into a `.env` file (using `dotenv`) and remove hardcoded strings from `app.js` and `docker-compose.yml`.
3.  **Idempotent Database Init:** Modify `model/init_db.js` to check if tables exist before attempting creation, or move seeding logic to a separate script (`npm run seed`) rather than running it inside the main application boot loop.