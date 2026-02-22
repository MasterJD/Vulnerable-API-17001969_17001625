/**
 * Tests for config.js — environment-based database configuration.
 *
 * Each test uses jest.resetModules() + a fresh require() to re-evaluate
 * config.js with a different value of process.env.STAGE.
 */

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should use LOCAL config when STAGE=LOCAL', () => {
    process.env.STAGE = 'LOCAL';
    const config = require('../config');

    expect(config.db.server).toContain('127.0.0.1');
    expect(config.db.database).toBe('vulnerablenode');
    expect(config.db.connectionString).toBe('postgres://postgres:postgres@127.0.0.1/vulnerablenode');
  });

  test('should use DOCKER config when STAGE=DOCKER', () => {
    process.env.STAGE = 'DOCKER';
    const config = require('../config');

    expect(config.db.server).toContain('postgres_db');
    expect(config.db.database).toBe('vulnerablenode');
    expect(config.db.connectionString).toContain('postgres_db');
  });

  test('should use DEVEL config when STAGE=DEVEL', () => {
    process.env.STAGE = 'DEVEL';
    const config = require('../config');

    expect(config.db.server).toContain('10.211.55.70');
    expect(config.db.database).toBe('vulnerablenode');
  });

  test('should default to LOCAL config when STAGE is undefined', () => {
    delete process.env.STAGE;
    const config = require('../config');

    expect(config.db.server).toContain('127.0.0.1');
  });

  test('should default to LOCAL config when STAGE is unknown', () => {
    process.env.STAGE = 'UNKNOWN_VALUE';
    const config = require('../config');

    expect(config.db.server).toContain('127.0.0.1');
  });

  test('should always build a valid connectionString', () => {
    process.env.STAGE = 'LOCAL';
    const config = require('../config');

    expect(config.db.connectionString).toMatch(/^postgres:\/\/.*\/vulnerablenode$/);
  });
});
