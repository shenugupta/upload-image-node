import "dotenv/config";
import { Profile } from "./enums";
import { loadConfig } from "./config";
import { createContainer } from "./container";
import { createApp } from "./app";
import { MockStorage } from "./storage/MockStorage";
import { errorMessage } from "./errors";
import type { CaughtError } from "./types";

async function main(): Promise<void> {
  const config = loadConfig();
  const { storage, urls, directUpload, stepFunctions, lambdaInvoker, users } =
    await createContainer(config);

  await storage.init();
  await users.init();

  const app = createApp({
    storage,
    urls,
    directUpload: directUpload instanceof MockStorage ? directUpload : null,
    stepFunctions,
    lambdaInvoker,
    users,
    config
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Profile: ${config.profile}`);
    console.log(
      config.profile === Profile.Mock
        ? "Rekognition: mock face match"
        : config.profile === Profile.Aws
          ? `Rekognition: real AWS CompareFaces (${config.aws.region})`
          : "Rekognition: LocalStack CompareFaces"
    );
    storage.describe().forEach((line) => console.log(line));
    console.log(
      `Postgres: ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
    );
  });
}

main().catch((error: CaughtError) => {
  console.error("Failed to start server:", errorMessage(error) || error);

  if (String(errorMessage(error) || error).includes("ECONNREFUSED")) {
    console.error("Start LocalStack with: npm run localstack");
    console.error("Start Postgres with: npm run postgres");
  }

  process.exit(1);
});
