require("dotenv").config();

const { loadConfig } = require("./config");
const { createContainer } = require("./container");
const { createApp } = require("./app");

async function main() {
  const config = loadConfig();
  const { storage, urls, directUpload, stepFunctions, lambdaInvoker } =
    await createContainer(config);

  await storage.init();

  const app = createApp({
    storage,
    urls,
    directUpload,
    stepFunctions,
    lambdaInvoker,
    config
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Profile: ${storage.profile}`);
    console.log(
      storage.profile === "mock"
        ? "Lambda: local AWS handler invoke (generateUploadUrl, listVideos, getVideo)"
        : "Lambda: LocalStack AWS Lambda invoke (generateUploadUrl, listVideos, getVideo)"
    );
    storage.describe().forEach((line) => console.log(line));
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error.message || error);

  if (String(error.message || error).includes("ECONNREFUSED")) {
    console.error("Start LocalStack with: npm run localstack");
  }

  process.exit(1);
});
