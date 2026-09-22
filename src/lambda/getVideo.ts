import { getLambdaRuntime } from "./runtime";
import type { LambdaHandler, VideoResult } from "../types";

export const handler: LambdaHandler<
  { key?: string },
  VideoResult & { openUrl: string }
> = async (event, context) => {
  console.log("[aws-lambda] getVideo invoked", {
    profile: process.env.PROFILE,
    functionName: context.functionName,
    awsRequestId: context.awsRequestId,
    event
  });

  const { storage, urls } = await getLambdaRuntime();
  const { key } = event;

  if (!key) {
    console.log("[aws-lambda] getVideo failed", { reason: "key is required" });
    throw new Error("key is required");
  }

  const data = await storage.getVideo({ key });
  const result = {
    ...data,
    openUrl: urls.openUrl(key)
  };

  console.log("[aws-lambda] getVideo success", result);
  return result;
};
