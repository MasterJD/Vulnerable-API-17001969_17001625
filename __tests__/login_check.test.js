/**
 * Tests for routes/login_check.js — session authentication guard.
 */

const check_logged = require('../routes/login_check');

describe('Login Check Middleware', () => {

  test('should redirect to /login when session.logged is undefined', () => {
    const req = { session: {}, url: '/products' };
    const res = { redirect: jest.fn() };

    check_logged(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login?returnurl=/products');
  });

  test('should redirect to /login when session.logged is false', () => {
    const req = { session: { logged: false }, url: '/dashboard' };
    const res = { redirect: jest.fn() };

    check_logged(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login?returnurl=/dashboard');
  });

  test('should NOT redirect when session.logged is true', () => {
    const req = { session: { logged: true }, url: '/products' };
    const res = { redirect: jest.fn() };

    check_logged(req, res);

    expect(res.redirect).not.toHaveBeenCalled();
  });

  test('should include the current URL as returnurl parameter', () => {
    const req = { session: {}, url: '/products/detail?id=5' };
    const res = { redirect: jest.fn() };

    check_logged(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      '/login?returnurl=/products/detail?id=5'
    );
  });
});
