require("dotenv").config();

const { loadConfig } = require("./config");
const { createContainer } = require("./container");

async function main() {
  const config = loadConfig();
  const { storage, stepFunctions } = await createContainer(config);

  await storage.init();

  const input = {
    fileName: process.argv[2] || "workflow-demo.mov",
    contentType: process.argv[3] || "video/quicktime",
    userId: process.argv[4] || process.env.USER_ID,
    email: process.env.EMAIL,
    doctype: process.argv[5] || process.env.DOCTYPE
  };

  console.log("[workflow] starting", {
    profile: process.env.PROFILE,
    input
  });

  const result = await stepFunctions.startExecution(input);

  console.log("[workflow] finished", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[workflow] failed", error.message || error);
  process.exit(1);
});
