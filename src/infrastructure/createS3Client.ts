import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { AwsClientAuth } from "../types";

export function createS3Client({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  sessionToken
}: AwsClientAuth): S3Client {
  const client: S3ClientConfig = {
    region
  };

  if (accessKeyId && secretAccessKey) {
    client.credentials = sessionToken
      ? { accessKeyId, secretAccessKey, sessionToken }
      : { accessKeyId, secretAccessKey };
  }

  if (endpoint) {
    client.endpoint = endpoint;
    client.forcePathStyle = true;
    client.requestChecksumCalculation = "WHEN_REQUIRED";
    client.responseChecksumValidation = "WHEN_REQUIRED";
  }

  return new S3Client(client);
}
