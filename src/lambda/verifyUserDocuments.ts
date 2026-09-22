import { getLambdaRuntime } from "./runtime";
import { verifyUserDocuments } from "../users/verifyUserDocuments";
import type { LambdaHandler, VerifyUserDocumentsResult } from "../types";

export const handler: LambdaHandler<
  { userId?: string | number; email?: string; doctype?: string },
  VerifyUserDocumentsResult
> = async (event, context) => {
  console.log("[aws-lambda] verifyUserDocuments invoked", {
    profile: process.env.PROFILE,
    functionName: context.functionName,
    awsRequestId: context.awsRequestId,
    event
  });

  const { storage, users, rekognition } = await getLambdaRuntime();
  const result = await verifyUserDocuments({
    users,
    storage,
    rekognition,
    input: event || {}
  });

  console.log("[aws-lambda] verifyUserDocuments complete", {
    verified: result.verified,
    reason: result.reason,
    document: result.document,
    selfie: result.selfie
  });

  return result;
};
