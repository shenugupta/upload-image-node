import { getLambdaRuntime } from "./runtime";
import type { LambdaHandler, ListedObject } from "../types";

export const handler: LambdaHandler<
  Record<string, unknown>,
  Array<ListedObject & { openUrl: string; getVideoUrl: string }>
> = async (event, context) => {
  console.log("[aws-lambda] listVideos invoked", {
    profile: process.env.PROFILE,
    functionName: context.functionName,
    awsRequestId: context.awsRequestId,
    event
  });

  const { storage, urls } = await getLambdaRuntime();
  const files = await storage.listVideos();
  const result = files.map((item) => ({
    ...item,
    openUrl: urls.openUrl(item.key),
    getVideoUrl: urls.getVideoUrl(item.key)
  }));

  console.log("[aws-lambda] listVideos success", { count: result.length });
  return result;
};
