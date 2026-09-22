import { Profile } from "../enums";
import { MockRekognition } from "../recognition/MockRekognition";
import { AwsRekognition } from "../recognition/AwsRekognition";
import { createRekognitionClient } from "./createRekognitionClient";
import type { AppConfig, RekognitionPort } from "../types";

export function createRekognition(config: AppConfig): RekognitionPort {
  if (config.profile === Profile.Mock) {
    return new MockRekognition();
  }

  if (config.profile === Profile.Aws) {
    return new AwsRekognition({
      client: createRekognitionClient(config.aws),
      localStack: false
    });
  }

  return new AwsRekognition({
    client: createRekognitionClient(config.localstack),
    localStack: true
  });
}
