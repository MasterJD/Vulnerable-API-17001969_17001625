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

    const init_db = require('../model/init_db');
    init_db();

    // Allow promises to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have been called for at least 3 CREATE TABLE statements
    const createCalls = mockDb.one.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
    );
    expect(createCalls.length).toBe(3);
  });

  test('should insert seed data when tables already exist (CREATE rejects)', async () => {
    const pgPromise = require('pg-promise');
    const mockDb = pgPromise._mockDb;

    // CREATE TABLE fails (table exists) → catch block inserts seed data
    // INSERT succeeds (resolves)
    mockDb.one.mockImplementation((query) => {
      if (typeof query === 'string' && query.includes('CREATE TABLE')) {
        return Promise.reject(new Error('relation already exists'));
      }
      return Promise.resolve({});
    });

    const init_db = require('../model/init_db');
    init_db();

    // Allow promises to settle (catches fire, then inserts run)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that INSERT queries were attempted for users and products
    const insertCalls = mockDb.one.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('INSERT')
    );
    // 2 users + 8 products = 10 insert calls
    expect(insertCalls.length).toBe(10);
  });

  test('should handle INSERT failures gracefully (empty catch blocks)', async () => {
    const pgPromise = require('pg-promise');
    const mockDb = pgPromise._mockDb;

    // Both CREATE and INSERT fail
    mockDb.one.mockRejectedValue(new Error('some db error'));

    const init_db = require('../model/init_db');

    // Should not throw even when everything fails
    expect(() => init_db()).not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 100));
  });
});
