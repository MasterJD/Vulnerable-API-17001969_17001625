var config = require("../config");
var dummy = require("../dummy");
var pgp = require('pg-promise')();

/*
    THIS FILE CREATES AND POPULATE THE DATABASE
 */

function init_db() {
    // Create tables and dummy data using idempotent operations.
    // This minimizes startup DB round-trips and avoids error-driven control flow.
    var db = pgp(config.db.connectionString);

    var createUsersTable = 'CREATE TABLE IF NOT EXISTS users(name VARCHAR(100) PRIMARY KEY, password VARCHAR(50));';
    var createProductsTable = 'CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name VARCHAR(100) not null, description TEXT not null, price INTEGER, image VARCHAR(500));';
    var createPurchasesTable = 'CREATE TABLE IF NOT EXISTS purchases(id SERIAL PRIMARY KEY, product_id INTEGER not null, product_name VARCHAR(100) not null, user_name VARCHAR(100), mail VARCHAR(100) not null, address VARCHAR(100) not null, phone VARCHAR(40) not null, ship_date VARCHAR(100) not null, price INTEGER not null);';

    var users = dummy.users;
    var userValues = [];
    var userPlaceholders = [];
    for (var i = 0; i < users.length; i++) {
        userValues.push(users[i].username, users[i].password);
        userPlaceholders.push('($' + (i * 2 + 1) + ', $' + (i * 2 + 2) + ')');
    }
    var seedUsers = 'INSERT INTO users(name, password) VALUES ' + userPlaceholders.join(', ') + ' ON CONFLICT (name) DO NOTHING;';

    var products = dummy.products;
    var productValues = [];
    var productPlaceholders = [];
    for (var j = 0; j < products.length; j++) {
        productValues.push(j, products[j].name, products[j].description, products[j].price, products[j].image);
        productPlaceholders.push('($' + (j * 5 + 1) + ', $' + (j * 5 + 2) + ', $' + (j * 5 + 3) + ', $' + (j * 5 + 4) + ', $' + (j * 5 + 5) + ')');
    }
    var seedProducts = 'INSERT INTO products(id, name, description, price, image) VALUES ' + productPlaceholders.join(', ') + ' ON CONFLICT (id) DO NOTHING;';

    db.none(createUsersTable)
        .then(function () {
            return db.none(createProductsTable);
        })
        .then(function () {
            return db.none(createPurchasesTable);
        })
        .then(function () {
            return db.none(seedUsers, userValues);
        })
        .then(function () {
            return db.none(seedProducts, productValues);
        })
        .catch(function () {
            // Keep backward-compatible behavior: boot should not crash on init errors.
        });
}

module.exports = init_db;