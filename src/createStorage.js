const { MockStorage } = require("./storage/MockStorage");
const { LocalStackStorage } = require("./storage/LocalStackStorage");
const { createS3Client } = require("./infrastructure/createS3Client");
const { createUrlBuilder } = require("./http/urlBuilder");

function createStorageDependencies(config) {
  const urls = createUrlBuilder(config.publicBaseUrl);

  if (process.env.PROFILE === "mock" || process.env.PROFILE === "aws") {
    const storage = new MockStorage({
      ...config.mock,
      expiresIn: config.expiresIn,
      publicBaseUrl: config.publicBaseUrl
    });

    if (process.env.PROFILE === "aws") {
      storage.profile = "aws";
    }

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
      `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock, npm run start:localstack, or npm run start:aws`
  );
}

module.exports = {
  createStorageDependencies
};
