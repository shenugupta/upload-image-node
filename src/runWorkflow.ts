import "dotenv/config";
import { loadConfig } from "./config";
import { createContainer } from "./container";
import { errorMessage } from "./errors";
import type { CaughtError } from "./types";

async function main(): Promise<void> {
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

main().catch((error: CaughtError) => {
  console.error("[workflow] failed", errorMessage(error) || error);
  process.exit(1);
});
