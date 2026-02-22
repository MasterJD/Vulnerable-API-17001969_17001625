/**
 * Tests for model/products.js — product CRUD operations.
 */

const pgPromise = require('pg-promise');
const mockDb = pgPromise._mockDb;

// Require the module under test (uses mocked pg-promise automatically)
const products = require('../model/products');

describe('Products Model', () => {

  beforeEach(() => {
    mockDb.one.mockReset();
    mockDb.many.mockReset();
    mockDb.one.mockResolvedValue({});
    mockDb.many.mockResolvedValue([]);
  });

  // ---- list() ----
  describe('list()', () => {
    test('should return all products from the database', async () => {
      const mockProducts = [
        { id: 1, name: 'Product A', description: 'Desc A', price: 10, image: 'a.jpg' },
        { id: 2, name: 'Product B', description: 'Desc B', price: 20, image: 'b.jpg' },
      ];
      mockDb.many.mockResolvedValueOnce(mockProducts);

      const result = await products.list();

      expect(result).toEqual(mockProducts);
      expect(mockDb.many).toHaveBeenCalled();

      const query = mockDb.many.mock.calls[0][0];
      expect(query).toContain('SELECT * FROM products');
    });
  });

  // ---- getProduct() ----
  describe('getProduct()', () => {
    test('should return a single product by ID', async () => {
      const mockProduct = { id: 3, name: 'Widget', description: 'A widget', price: 15, image: 'w.jpg' };
      mockDb.one.mockResolvedValueOnce(mockProduct);

      const result = await products.getProduct(3);

      expect(result).toEqual(mockProduct);

      const query = mockDb.one.mock.calls[0][0];
      expect(query).toContain("id = '3'");
    });

    test('should reject when product is not found', async () => {
      mockDb.one.mockRejectedValueOnce(new Error('No data returned'));

      await expect(products.getProduct(999)).rejects.toThrow('No data returned');
    });
  });

  // ---- search() ----
  describe('search()', () => {
    test('should search products by name or description', async () => {
      const mockResults = [{ id: 1, name: 'Rocket', description: 'USB rocket', price: 50, image: 'r.jpg' }];
      mockDb.many.mockResolvedValueOnce(mockResults);

      const result = await products.search('rocket');

      expect(result).toEqual(mockResults);

      const query = mockDb.many.mock.calls[0][0];
      expect(query).toContain('ILIKE');
      expect(query).toContain('rocket');
    });

    test('should return empty when no matches found', async () => {
      mockDb.many.mockRejectedValueOnce(new Error('No data returned'));

      await expect(products.search('nonexistent')).rejects.toThrow();
    });
  });

  // ---- purchase() ----
  describe('purchase()', () => {
    test('should insert a purchase record', async () => {
      mockDb.one.mockResolvedValueOnce({ id: 1 });

      const cart = {
        mail: 'test@test.com',
        product_name: 'Widget',
        username: 'admin',
        product_id: '1',
        address: '123 Main St',
        ship_date: '2025-01-01',
        phone: '555-0100',
        price: '25',
      };

      const result = await products.purchase(cart);

      expect(result).toEqual({ id: 1 });

      const query = mockDb.one.mock.calls[0][0];
      expect(query).toContain('INSERT INTO purchases');
      expect(query).toContain('test@test.com');
      expect(query).toContain('Widget');
    });
  });

  // ---- getPurchased() ----
  describe('getPurchased()', () => {
    test('should return all purchases for a given user', async () => {
      const mockPurchases = [
        { id: 1, product_id: 1, product_name: 'Widget', user_name: 'admin', mail: 'a@b.com', address: '123', phone: '555', ship_date: '2025-01-01', price: 10 },
      ];
      mockDb.many.mockResolvedValueOnce(mockPurchases);

      const result = await products.getPurchased('admin');

      expect(result).toEqual(mockPurchases);

      const query = mockDb.many.mock.calls[0][0];
      expect(query).toContain("user_name = 'admin'");
    });

    test('should reject when user has no purchases', async () => {
      mockDb.many.mockRejectedValueOnce(new Error('No data returned'));

      await expect(products.getPurchased('nobody')).rejects.toThrow();
    });
  });
});
