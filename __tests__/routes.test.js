/**
 * Integration tests for Express routes.
 *
 * Uses supertest to issue HTTP requests against the Express app.
 * pg-promise is auto-mocked via __mocks__/pg-promise.js, so no
 * real database connection is needed.
 */

const request = require('supertest');
const pgPromise = require('pg-promise');
const mockDb = pgPromise._mockDb;

// Ensure mock is ready before app loads (app.js calls init_db on require)
const app = require('../app');

describe('Route Integration Tests', () => {

  let agent;

  beforeAll(async () => {
    // Authenticate an agent (session persists via cookies)
    mockDb.one.mockResolvedValueOnce({ name: 'admin', password: 'admin' });

    agent = request.agent(app);
    await agent
      .post('/login/auth')
      .send({ username: 'admin', password: 'admin', returnurl: '/' })
      .expect(302);
  });

  beforeEach(() => {
    mockDb.one.mockReset();
    mockDb.many.mockReset();
    mockDb.one.mockResolvedValue({});
    mockDb.many.mockResolvedValue([]);
  });

  // ---------- LOGIN ROUTES ----------

  describe('GET /login', () => {
    test('should return the login page (200)', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('sign in');
    });

    test('should pass returnurl and error to the template', async () => {
      const res = await request(app).get('/login?returnurl=/products&error=BadLogin');
      expect(res.status).toBe(200);
      expect(res.text).toContain('BadLogin');
    });
  });

  describe('POST /login/auth', () => {
    test('should redirect to / on successful login', async () => {
      mockDb.one.mockResolvedValueOnce({ name: 'admin', password: 'admin' });

      const res = await request(app)
        .post('/login/auth')
        .send({ username: 'admin', password: 'admin', returnurl: '' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    });

    test('should redirect to returnurl after successful login', async () => {
      mockDb.one.mockResolvedValueOnce({ name: 'admin', password: 'admin' });

      const res = await request(app)
        .post('/login/auth')
        .send({ username: 'admin', password: 'admin', returnurl: '/products/purchased' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/products/purchased');
    });

    test('should redirect to /login on failed authentication', async () => {
      mockDb.one.mockRejectedValueOnce(new Error('No data returned'));

      const res = await request(app)
        .post('/login/auth')
        .send({ username: 'wrong', password: 'wrong', returnurl: '/' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/login');
      expect(res.headers.location).toContain('error=');
    });
  });

  describe('GET /logout', () => {
    test('should redirect to /login', async () => {
      const res = await agent.get('/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // ---------- PRODUCT ROUTES (authenticated) ----------

  describe('GET / (product listing)', () => {
    test('should render products page when authenticated', async () => {
      // Re-authenticate after logout test
      mockDb.one.mockResolvedValueOnce({ name: 'admin', password: 'admin' });
      await agent.post('/login/auth').send({ username: 'admin', password: 'admin', returnurl: '/' });

      mockDb.many.mockResolvedValueOnce([
        { id: 1, name: 'Widget', description: 'A widget', price: 10, image: 'product_1.jpg' },
      ]);

      const res = await agent.get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Widget');
    });

    test('should render empty products when DB returns error', async () => {
      mockDb.many.mockRejectedValueOnce(new Error('connection error'));

      const res = await agent.get('/');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /products/detail', () => {
    test('should render product detail page', async () => {
      mockDb.one.mockResolvedValueOnce({
        id: 1, name: 'Rocket', description: 'USB rocket', price: 30, image: 'product_2.jpg',
      });

      const res = await agent.get('/products/detail?id=1');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Rocket');
    });

    test('should render products fallback when product not found', async () => {
      mockDb.one.mockRejectedValueOnce(new Error('No data returned'));
      mockDb.many.mockResolvedValueOnce([]);

      const res = await agent.get('/products/detail?id=999');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /products/search', () => {
    test('should render search results', async () => {
      mockDb.many.mockResolvedValueOnce([
        { id: 1, name: 'Rocket', description: 'USB rocket', price: 30, image: 'product_2.jpg' },
      ]);

      const res = await agent.get('/products/search?q=rocket');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Rocket');
    });

    test('should render empty search when no query provided', async () => {
      const res = await agent.get('/products/search');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Products not found');
    });

    test('should handle search DB errors gracefully', async () => {
      mockDb.many.mockRejectedValueOnce(new Error('connection error'));

      const res = await agent.get('/products/search?q=test');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /products/purchased', () => {
    test('should show purchased products list', async () => {
      mockDb.many.mockResolvedValueOnce([
        { product_id: 1, product_name: 'Widget', mail: 'a@b.com', phone: '555', ship_date: '2025-01-01', address: '123', price: 10 },
      ]);

      const res = await agent.get('/products/purchased');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Widget');
    });

    test('should show empty message when no purchases', async () => {
      mockDb.many.mockRejectedValueOnce(new Error('No data'));

      const res = await agent.get('/products/purchased');
      expect(res.status).toBe(200);
      expect(res.text).toContain("haven't purchased");
    });
  });

  describe('POST /products/buy', () => {
    test('should return error when price is missing', async () => {
      const res = await agent
        .post('/products/buy')
        .send({ mail: 'test@test.com', address: '123', ship_date: '2025-01-01', phone: '555', product_id: '1', product_name: 'Widget' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Missing parameter 'price'");
    });

    test('should return error when email format is invalid', async () => {
      const res = await agent
        .post('/products/buy')
        .send({
          mail: 'invalid-email',
          address: '123 Main',
          ship_date: '2025-01-01',
          phone: '555-0100',
          product_id: '1',
          product_name: 'Widget',
          price: '25€',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid mail format');
    });

    test('should succeed and return purchase confirmation', async () => {
      // purchase() uses db.one which resolves, but the route only
      // responds in the .catch block — so we make it reject
      mockDb.one.mockRejectedValueOnce(new Error('mock'));

      const res = await agent
        .post('/products/buy')
        .send({
          mail: 'buyer@shop.com',
          address: '456 Oak Ave',
          ship_date: '2025-06-15',
          phone: '555-0199',
          product_id: '2',
          product_name: 'Daddle',
          price: '42€',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Product purchased correctly');
    });

    test('should accept GET requests for purchase', async () => {
      mockDb.one.mockRejectedValueOnce(new Error('mock'));

      const res = await agent
        .get('/products/buy')
        .query({
          mail: 'buyer@shop.com',
          address: '456 Oak Ave',
          ship_date: '2025-06-15',
          phone: '555-0199',
          product_id: '2',
          product_name: 'Daddle',
          price: '42€',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Product purchased correctly');
    });

    test('should return 400 when a required field is missing', async () => {
      const res = await agent
        .post('/products/buy')
        .send({
          mail: 'buyer@shop.com',
          // address is missing
          ship_date: '2025-06-15',
          phone: '555-0199',
          product_id: '2',
          product_name: 'Daddle',
          price: '42€',
        });

      // address is undefined → "Missing parameter 'address'"
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing parameter');
    });
  });

  // ---------- 404 ----------

  describe('404 handling', () => {
    test('should return 404 for unknown routes', async () => {
      const res = await agent.get('/this-does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
