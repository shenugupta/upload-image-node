import { AwsPlaceholderCredential } from "../enums";
import { LambdaClient } from "@aws-sdk/client-lambda";
import type { AwsClientAuth } from "../types";

export function createLambdaClient({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey
}: AwsClientAuth): LambdaClient {
  return new LambdaClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: accessKeyId || AwsPlaceholderCredential.Test,
      secretAccessKey: secretAccessKey || AwsPlaceholderCredential.Test
    }
  });
}
