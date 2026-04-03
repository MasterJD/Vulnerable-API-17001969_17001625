/**
 * Tests for model/init_db.js — database schema bootstrap.
 *
 * init_db() creates tables and, if they already exist (error/reject),
 * populates them with dummy seed data from dummy.js.
 *
 * Each test uses jest.resetModules() to get a fresh init_db and a fresh
 * pg-promise mock instance (since resetModules clears the module cache).
 */

describe('init_db', () => {

  beforeEach(() => {
    jest.resetModules();
  });

  test('should attempt to create all three tables', async () => {
    // Re-require after module reset to get fresh mock
    const pgPromise = require('pg-promise');
    const mockDb = pgPromise._mockDb;
    mockDb.one.mockResolvedValue({});
    mockDb.none.mockResolvedValue(undefined);

    const init_db = require('../model/init_db');
    init_db();

    // Allow promises to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have been called for at least 3 CREATE TABLE statements
    const createCalls = mockDb.none.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS')
    );
    expect(createCalls.length).toBe(3);
  });

  test('should insert seed data using bulk idempotent queries', async () => {
    const pgPromise = require('pg-promise');
    const mockDb = pgPromise._mockDb;

    mockDb.none.mockResolvedValue(undefined);

    const init_db = require('../model/init_db');
    init_db();

    // Allow promise chain to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    const userInsertCall = mockDb.none.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO users')
    );
    const productInsertCall = mockDb.none.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO products')
    );

    expect(userInsertCall).toBeDefined();
    expect(productInsertCall).toBeDefined();
    expect(userInsertCall[0]).toContain('ON CONFLICT (name) DO NOTHING');
    expect(productInsertCall[0]).toContain('ON CONFLICT (id) DO NOTHING');
  });

  test('should handle DB initialization failures gracefully', async () => {
    const pgPromise = require('pg-promise');
    const mockDb = pgPromise._mockDb;

    // Fail any init query in the promise chain
    mockDb.none.mockRejectedValue(new Error('some db error'));

    const init_db = require('../model/init_db');

    // Should not throw even when everything fails
    expect(() => init_db()).not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 100));
  });
});
