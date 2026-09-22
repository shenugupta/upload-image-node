const { loadConfig } = require("../config");
const { createStorageDependencies } = require("../createStorage");
const { createPostgresPool } = require("../infrastructure/createPostgresPool");
const { PostgresUserStore } = require("../users/PostgresUserStore");
const { createRekognition } = require("../infrastructure/createRekognition");

let runtimePromise;

async function getLambdaRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const config = loadConfig();
      const deps = createStorageDependencies(config);
      await deps.storage.init();

      const users = new PostgresUserStore({
        pool: createPostgresPool(config)
      });
      await users.init();

      const rekognition = createRekognition(config);

      return {
        config,
        users,
        rekognition,
        ...deps
      };
    })();
  }

  return runtimePromise;
}

module.exports = {
  getLambdaRuntime
};
