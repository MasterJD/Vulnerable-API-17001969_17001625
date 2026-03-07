var config = require("../config"),
    pgp = require('pg-promise')();

/**
 * Authenticates a user against the database using parameterized queries.
 * 
 * SECURITY FIX (Delivery 3): Replaced direct string concatenation with
 * pg-promise parameterized query to prevent SQL Injection (CWE-89).
 * 
 * Before: var q = "SELECT * FROM users WHERE name = '" + username + "' ...";
 * After:  Parameterized query using $1, $2 placeholders.
 * 
 * @param {string} username - The username to authenticate.
 * @param {string} password - The password to verify.
 * @returns {Promise} Resolves with user data if authentication succeeds.
 */
function do_auth(username, password) {
    var db = pgp(config.db.connectionString);

    var q = "SELECT * FROM users WHERE name = $1 AND password = $2;";

    return db.one(q, [username, password]);
}

module.exports = do_auth;