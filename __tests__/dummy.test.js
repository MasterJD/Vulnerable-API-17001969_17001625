/**
 * Tests for dummy.js — static seed data used to populate the database.
 */

const dummy = require('../dummy');

describe('Dummy Data', () => {

  describe('Users', () => {
    test('should export an array of users', () => {
      expect(Array.isArray(dummy.users)).toBe(true);
    });

    test('should contain exactly 2 seed users', () => {
      expect(dummy.users).toHaveLength(2);
    });

    test('should include admin user with correct credentials', () => {
      const admin = dummy.users.find(u => u.username === 'admin');
      expect(admin).toBeDefined();
      expect(admin.password).toBe('admin');
    });

    test('should include roberto user with correct credentials', () => {
      const roberto = dummy.users.find(u => u.username === 'roberto');
      expect(roberto).toBeDefined();
      expect(roberto.password).toBe('asdfpiuw981');
    });

    test('each user should have username and password fields', () => {
      dummy.users.forEach(user => {
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('password');
        expect(typeof user.username).toBe('string');
        expect(typeof user.password).toBe('string');
      });
    });
  });

  describe('Products', () => {
    test('should export an array of products', () => {
      expect(Array.isArray(dummy.products)).toBe(true);
    });

    test('should contain exactly 8 seed products', () => {
      expect(dummy.products).toHaveLength(8);
    });

    test('each product should have required fields', () => {
      dummy.products.forEach(product => {
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('image');
      });
    });

    test('each product price should be a number', () => {
      dummy.products.forEach(product => {
        expect(typeof product.price).toBe('number');
      });
    });

    test('each product image should be a non-empty string', () => {
      dummy.products.forEach(product => {
        expect(typeof product.image).toBe('string');
        expect(product.image.length).toBeGreaterThan(0);
      });
    });
  });
});
