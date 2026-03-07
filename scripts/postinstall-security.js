#!/usr/bin/env node

/**
 * Post-Install Security Update Script
 * ====================================
 * Automatically regenerates the SBOM and vulnerability report
 * after every `npm install` / `npm ci` to keep security artifacts
 * in sync with the current dependency tree.
 *
 * Part of Delivery 3: Security Hardening (DevSecOps)
 *
 * Requirements: Trivy must be installed on the system.
 * If Trivy is not found, the script prints a warning and exits
 * gracefully (does not block the install process).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SECURITY_DIR = path.join(ROOT, 'security');
const REPORTS_DIR = path.join(SECURITY_DIR, 'reports');

// ANSI colors for terminal output
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(color, label, msg) {
  console.log(`${color}[${label}]${RESET} ${msg}`);
}

function ensureDirectories() {
  if (!fs.existsSync(SECURITY_DIR)) fs.mkdirSync(SECURITY_DIR);
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function isTrivyInstalled() {
  try {
    execSync('trivy --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function generateSBOM() {
  log(CYAN, 'SBOM', 'Generating CycloneDX SBOM...');
  try {
    execSync('trivy fs --format cyclonedx -o security/sbom.json .', {
      cwd: ROOT,
      stdio: 'pipe'
    });
    log(GREEN, 'SBOM', 'security/sbom.json updated successfully.');
  } catch (err) {
    log(RED, 'SBOM', 'Failed to generate SBOM: ' + err.message);
  }
}

function generateVulnReport() {
  log(CYAN, 'VULN', 'Running vulnerability scan...');
  try {
    execSync('trivy fs --scanners vuln --format json -o security/reports/vuln-latest.json .', {
      cwd: ROOT,
      stdio: 'pipe'
    });
    log(GREEN, 'VULN', 'security/reports/vuln-latest.json updated successfully.');
  } catch (err) {
    log(RED, 'VULN', 'Failed to generate vulnerability report: ' + err.message);
  }
}

// ---- Main ----

// Skip during postinstall in CI (triggered by npm ci) — the CI workflow
// calls this script explicitly via `npm run security:update` at the right stage.
if (process.env.CI && process.env.npm_lifecycle_event === 'postinstall') {
  log(YELLOW, 'SKIP', 'CI postinstall detected — security artifacts will be generated in a dedicated CI step.');
  process.exit(0);
}

log(CYAN, 'SECURITY', 'Running security artifact update...');

if (!isTrivyInstalled()) {
  log(YELLOW, 'WARN', 'Trivy is not installed. Skipping SBOM and vulnerability report generation.');
  log(YELLOW, 'WARN', 'Install Trivy: https://aquasecurity.github.io/trivy/latest/getting-started/installation/');
  process.exit(0);
}

ensureDirectories();
generateSBOM();
generateVulnReport();

log(GREEN, 'SECURITY', 'All security artifacts are up to date.');
