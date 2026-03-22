#!/usr/bin/env node

/**
 * DevEx One-Command Environment Bootstrap
 * ---------------------------------------
 * Spins up full local environment in one command:
 *   npm run devex:up
 *
 * Actions:
 * 1) docker compose up -d --build
 * 2) waits for postgres to become healthy
 * 3) restarts app service once (workaround for current init_db flow)
 * 4) prints URL and default credentials
 */

const { execSync } = require('child_process');

const APP_URL = 'http://127.0.0.1:3000/login';
const MAX_WAIT_SECONDS = 180;
const SLEEP_MS = 5000;

function run(cmd, options = {}) {
  return execSync(cmd, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: options.capture ? 'utf8' : undefined
  });
}

function commandExists(cmd) {
  try {
    run(cmd, { capture: false });
    return true;
  } catch {
    return false;
  }
}

function detectComposeBase() {
  if (commandExists('docker compose version')) {
    return 'docker compose';
  }

  if (commandExists('docker-compose version')) {
    return 'docker-compose';
  }

  throw new Error('Docker Compose was not found. Install Docker Desktop / Docker Compose first.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPostgresHealthy(composeBase) {
  try {
    const output = run(`${composeBase} ps`, { capture: true });
    return /postgres_db[\s\S]*\(healthy\)/i.test(output);
  } catch {
    return false;
  }
}

async function waitForPostgres(composeBase) {
  process.stdout.write('Waiting for postgres healthcheck');

  for (let elapsed = 0; elapsed < MAX_WAIT_SECONDS; elapsed += SLEEP_MS / 1000) {
    if (isPostgresHealthy(composeBase)) {
      process.stdout.write(' done\n');
      return;
    }

    process.stdout.write('.');
    await sleep(SLEEP_MS);
  }

  process.stdout.write('\n');
  throw new Error(`postgres_db did not become healthy within ${MAX_WAIT_SECONDS} seconds.`);
}

async function main() {
  try {
    const composeBase = detectComposeBase();

    console.log('[DevEx] Starting environment using:', composeBase);
    run(`${composeBase} up -d --build`);

    await waitForPostgres(composeBase);

    // Current app startup logic seeds default users/products on second init path.
    // This restart removes manual steps and keeps setup as one command.
    console.log('[DevEx] Restarting app service once to finalize seeded demo data...');
    run(`${composeBase} restart vulnerable_node`);

    console.log('[DevEx] Environment is ready.');
    console.log('[DevEx] URL:', APP_URL);
    console.log('[DevEx] Demo credentials: admin/admin or roberto/asdfpiuw981');
  } catch (err) {
    console.error('[DevEx] Setup failed:', err.message);
    process.exit(1);
  }
}

main();
