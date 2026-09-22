import {
  RekognitionClient,
  type RekognitionClientConfig
} from "@aws-sdk/client-rekognition";
import type { AwsClientAuth } from "../types";

export function createRekognitionClient({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  sessionToken
}: AwsClientAuth): RekognitionClient {
  const client: RekognitionClientConfig = {
    region
  };

  if (accessKeyId && secretAccessKey) {
    client.credentials = sessionToken
      ? { accessKeyId, secretAccessKey, sessionToken }
      : { accessKeyId, secretAccessKey };
  }

  if (endpoint) {
    client.endpoint = endpoint;
  }

  return new RekognitionClient(client);
}
