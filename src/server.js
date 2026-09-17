require("dotenv").config();

const { loadConfig } = require("./config");
const { createContainer } = require("./container");
const { createApp } = require("./app");

async function main() {
  const config = loadConfig();
  const { storage } = createContainer(config);

  await storage.init();

  const app = createApp({ storage, config });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Profile: ${process.env.PROFILE}`);

    if (process.env.PROFILE === "mock") {
      console.log(`Mock upload directory: ${config.mock.uploadDir}`);
    } else if (process.env.PROFILE === "localstack") {
      console.log(`LocalStack S3 endpoint: ${config.localstack.endpoint}`);
      console.log(`S3 bucket: ${config.localstack.bucket}`);
    }
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error.message || error);

  if (String(error.message || error).includes("ECONNREFUSED")) {
    console.error("Start LocalStack with: npm run localstack");
  }

  process.exit(1);
});
