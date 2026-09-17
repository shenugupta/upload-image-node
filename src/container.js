const { createMockStorage } = require("./storage/mockStorage");
const { createLocalstackStorage } = require("./storage/localstackStorage");

function createContainer(config) {
  let storage;

  if (process.env.PROFILE === "mock") {
    storage = createMockStorage(config);
  } else if (process.env.PROFILE === "localstack") {
    storage = createLocalstackStorage(config);
  } else {
    throw new Error(
      `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock or npm run start:localstack`
    );
  }

  return {
    config,
    storage
  };
}

module.exports = {
  createContainer
};
