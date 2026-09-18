const { loadConfig } = require("../config");
const { createStorageDependencies } = require("../createStorage");

let runtimePromise;

async function getLambdaRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const config = loadConfig();
      const deps = createStorageDependencies(config);
      await deps.storage.init();
      return deps;
    })();
  }

  return runtimePromise;
}

module.exports = {
  getLambdaRuntime
};
