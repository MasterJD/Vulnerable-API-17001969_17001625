var config = require("../config"),
    pgp = require('pg-promise')(),
    db = pgp(config.db.connectionString);

/**
 * Product data access module.
 * 
 * SECURITY FIX (Delivery 3): All functions below have been refactored
 * to use pg-promise parameterized queries instead of string concatenation,
 * eliminating SQL Injection vulnerabilities (CWE-89).
 * 
 * Each function remains self-contained within this module boundary,
 * preserving the modular monolith architecture.
 */

function list_products() {
    var q = "SELECT * FROM products;";
    return db.many(q);
}

function getProduct(product_id) {
    var q = "SELECT * FROM products WHERE id = $1;";
    return db.one(q, [product_id]);
}

function search(query) {
    var q = "SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1;";
    return db.many(q, ['%' + query + '%']);
}

function purchase(cart) {
    var q = "INSERT INTO purchases(mail, product_name, user_name, product_id, address, phone, ship_date, price) VALUES($1, $2, $3, $4, $5, $6, $7, $8);";
    return db.one(q, [
        cart.mail,
        cart.product_name,
        cart.username,
        cart.product_id,
        cart.address,
        cart.phone,
        cart.ship_date,
        cart.price
    ]);
}

function get_purcharsed(username) {
    var q = "SELECT * FROM purchases WHERE user_name = $1;";
    return db.many(q, [username]);
}

function create_product(product) {
    var q = "INSERT INTO products(id, name, description, price, image) VALUES((SELECT COALESCE(MAX(id), 0) + 1 FROM products), $1, $2, $3, $4) RETURNING id;";
    return db.one(q, [product.name, product.description, product.price, product.image]);
}

function delete_product(product_id) {
    var q = "DELETE FROM products WHERE id = $1;";
    return db.none(q, [product_id]);
}

var actions = {
    "list": list_products,
    "getProduct": getProduct,
    "search": search,
    "purchase": purchase,
    "getPurchased": get_purcharsed,
    "createProduct": create_product,
    "deleteProduct": delete_product
}

module.exports = actions;
