require("dotenv").config();

const { loadConfig } = require("./config");
const { createContainer } = require("./container");
const { createApp } = require("./app");

async function main() {
  const config = loadConfig();
  const { storage, urls, directUpload, stepFunctions, lambdaInvoker, users } =
    await createContainer(config);

  await storage.init();
  await users.init();

  const app = createApp({
    storage,
    urls,
    directUpload,
    stepFunctions,
    lambdaInvoker,
    users,
    config
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Profile: ${config.profile}`);
    console.log(
      config.profile === "mock"
        ? "Rekognition: mock face match"
        : config.profile === "aws"
          ? `Rekognition: real AWS CompareFaces (${config.aws.region})`
          : "Rekognition: LocalStack CompareFaces"
    );
    storage.describe().forEach((line) => console.log(line));
    console.log(
      `Postgres: ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
    );
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error.message || error);

  if (String(error.message || error).includes("ECONNREFUSED")) {
    console.error("Start LocalStack with: npm run localstack");
    console.error("Start Postgres with: npm run postgres");
  }

  process.exit(1);
});
