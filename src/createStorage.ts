import { MockStorage } from "./storage/MockStorage";
import { LocalStackStorage } from "./storage/LocalStackStorage";
import { createS3Client } from "./infrastructure/createS3Client";
import { createUrlBuilder } from "./http/urlBuilder";
import type { AppConfig, StorageDependencies } from "./types";

export function createStorageDependencies(config: AppConfig): StorageDependencies {
  const urls = createUrlBuilder(config.publicBaseUrl);

  if (process.env.PROFILE === "aws") {
    if (config.aws.bucket) {
      const storage = new LocalStackStorage({
        s3: createS3Client(config.aws),
        bucket: config.aws.bucket,
        expiresIn: config.expiresIn,
        profile: "aws",
        manageBucket: false
      });

      return {
        storage,
        urls,
        directUpload: null
      };
    }

    const storage = new MockStorage({
      ...config.mock,
      expiresIn: config.expiresIn,
      publicBaseUrl: config.publicBaseUrl
    });
    storage.profile = "aws";

    return {
      storage,
      urls,
      directUpload: storage
    };
  }

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
    `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock, npm run start:localstack, or npm run start:aws`
  );
}
