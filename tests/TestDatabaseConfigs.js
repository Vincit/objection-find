const os = require('os');
const path = require('path');

const POSTGRESQL_CONFIG = Object.freeze({
  client: 'postgres',
  connection: {
    host: '127.0.0.1',
    database: 'objection_find_test'
  },
  pool: {
    min: 0,
    max: 10
  }
});

const SQLITE_CONFIG = Object.freeze({
  client: 'sqlite3',
  connection: {
    filename: path.join(os.tmpdir(), 'objection_find_test.db')
  },
  useNullAsDefault: true
});

const MYSQL_CONFIG = Object.freeze({
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'travis',
    database: 'objection_find_test'
  },
  pool: {
    min: 0,
    max: 10
  }
});

module.exports = {
  POSTGRESQL_CONFIG,
  SQLITE_CONFIG,
  MYSQL_CONFIG
};
