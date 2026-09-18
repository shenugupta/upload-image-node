const { MockStorage } = require("./storage/MockStorage");
const { LocalStackStorage } = require("./storage/LocalStackStorage");
const { createS3Client } = require("./infrastructure/createS3Client");
const { createUrlBuilder } = require("./http/urlBuilder");

function createStorageDependencies(config) {
  const urls = createUrlBuilder(config.publicBaseUrl);

  if (process.env.PROFILE === "mock") {
    const storage = new MockStorage({
      ...config.mock,
      expiresIn: config.expiresIn,
      publicBaseUrl: config.publicBaseUrl
    });

    return {
      storage,
      urls,
      directUpload: storage
    };
  }

  if (process.env.PROFILE === "localstack") {
    const storage = new LocalStackStorage({
      s3: createS3Client(config.localstack),
      bucket: config.localstack.bucket,
      expiresIn: config.expiresIn,
      endpoint: config.localstack.endpoint,
      publicEndpoint: config.localstack.publicEndpoint
    });

    return {
      storage,
      urls,
      directUpload: null
    };
  }

  throw new Error(
    `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock or npm run start:localstack`
  );
}

module.exports = {
  createStorageDependencies
};
