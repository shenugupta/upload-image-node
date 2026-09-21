const { Pool } = require("pg");

function createPostgresPool(config) {
  return new Pool(config.postgres);
}

module.exports = {
  createPostgresPool
};
