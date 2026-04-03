/**
 * Manual Jest mock for the `pg-promise` npm module.
 * ===================================================
 * Placed in __mocks__/ adjacent to node_modules so Jest
 * automatically intercepts `require('pg-promise')` in ALL
 * test files without needing explicit `jest.mock()` calls.
 *
 * Mock chain mirrors real pg-promise usage:
 *   const pgp = require('pg-promise')();   // pgPromise() → pgp
 *   const db  = pgp(connectionString);     // pgp()       → mockDb
 *   db.one(sql)                            // → Promise
 *   db.many(sql)                           // → Promise
 */

const mockDb = {
  one: jest.fn().mockResolvedValue({}),
  none: jest.fn().mockResolvedValue(undefined),
  many: jest.fn().mockResolvedValue([]),
};

// pgp(connectionString) always returns the same mockDb object
const pgp = jest.fn(() => mockDb);

// require('pg-promise')() returns pgp
const pgPromise = jest.fn(() => pgp);

// Expose internals so tests can configure mock return values
pgPromise._mockDb = mockDb;
pgPromise._pgp = pgp;

module.exports = pgPromise;
