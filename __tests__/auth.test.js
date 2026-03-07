/**
 * Tests for model/auth.js — user authentication against the database.
 */

const pgPromise = require('pg-promise');
const mockDb = pgPromise._mockDb;

describe('Auth Model', () => {

  beforeEach(() => {
    mockDb.one.mockReset();
    mockDb.many.mockReset();
    // Restore defaults after reset
    mockDb.one.mockResolvedValue({});
    mockDb.many.mockResolvedValue([]);
  });

  test('should resolve with user data when credentials are valid', async () => {
    mockDb.one.mockResolvedValueOnce({ name: 'admin', password: 'admin' });

    const auth = require('../model/auth');
    const result = await auth('admin', 'admin');

    expect(result).toEqual({ name: 'admin', password: 'admin' });
    expect(mockDb.one).toHaveBeenCalled();
  });

  test('should build a parameterized SQL query for authentication', async () => {
    mockDb.one.mockResolvedValueOnce({ name: 'testuser', password: 'testpass' });

    const auth = require('../model/auth');
    await auth('testuser', 'testpass');

    const query = mockDb.one.mock.calls[0][0];
    const params = mockDb.one.mock.calls[0][1];
    // Security: query must use parameterized placeholders, not literal values
    expect(query).toContain('$1');
    expect(query).toContain('$2');
    expect(query).toContain('SELECT');
    expect(query).toContain('users');
    // Verify parameters are passed separately
    expect(params).toEqual(['testuser', 'testpass']);
  });

  test('should reject when credentials are invalid (no rows returned)', async () => {
    mockDb.one.mockRejectedValueOnce(new Error('No data returned'));

    const auth = require('../model/auth');

    await expect(auth('bad', 'bad')).rejects.toThrow('No data returned');
  });
});
