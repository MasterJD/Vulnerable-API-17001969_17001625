var config_local = {
    // Customer module configs
    "db": {
        "server": "postgres://postgres:postgres@127.0.0.1",
        "database": "vulnerablenode"
    }
}

var config_devel = {
    // Customer module configs
    "db": {
        "server": "postgres://postgres:postgres@10.211.55.70",
        "database": "vulnerablenode"
    }
}

var config_docker = {
    // Customer module configs
    "db": {
        "server": "postgres://postgres:postgres@postgres_db",
        "database": "vulnerablenode"
    }
}

var env_connection_string =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

// Select correct config
var config = null;

if (env_connection_string) {
    config = {
        "db": {
            "connectionString": env_connection_string
        }
    };
} else {
    switch (process.env.STAGE){
        case "DOCKER":
            config = config_docker;
            break;

        case "LOCAL":
            config = config_local;
            break;

        case "DEVEL":
            config = config_devel;
            break;

        default:
            config = config_local;
    }

    // Build connection string
    config.db.connectionString = config.db.server + "/" + config.db.database
}

module.exports = config;