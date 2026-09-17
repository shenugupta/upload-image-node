const { MockStorage } = require("./storage/MockStorage");
const { LocalStackStorage } = require("./storage/LocalStackStorage");
const { createS3Client } = require("./infrastructure/createS3Client");
const { createUrlBuilder } = require("./http/urlBuilder");

function createMockDependencies(config) {
  const storage = new MockStorage({
    ...config.mock,
    expiresIn: config.expiresIn,
    publicBaseUrl: config.publicBaseUrl
  });

  return {
    storage,
    directUpload: storage
  };
}

function createLocalstackDependencies(config) {
  const storage = new LocalStackStorage({
    s3: createS3Client(config.localstack),
    bucket: config.localstack.bucket,
    expiresIn: config.expiresIn,
    endpoint: config.localstack.endpoint
  });

  return {
    storage,
    directUpload: null
  };
}

function createContainer(config) {
  let dependencies;

  if (process.env.PROFILE === "mock") {
    dependencies = createMockDependencies(config);
  } else if (process.env.PROFILE === "localstack") {
    dependencies = createLocalstackDependencies(config);
  } else {
    throw new Error(
      `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock or npm run start:localstack`
    );
  }

  return {
    config,
    urls: createUrlBuilder(config.publicBaseUrl),
    ...dependencies
  };
}

module.exports = {
  createContainer
};
