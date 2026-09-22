import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import {
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  type LambdaClient
} from "@aws-sdk/client-lambda";
import { CreateBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client } from "../infrastructure/createS3Client";
import { LAMBDA_FUNCTIONS } from "./functionNames";
import { isNamedError } from "../errors";
import type { AppConfig } from "../types";

const ARTIFACT_BUCKET = "lambda-artifacts";
const ARTIFACT_KEY = "video-lambdas.zip";
const PROJECT_ROOT = path.join(__dirname, "../..");

const HANDLERS: Record<string, string> = {
  [LAMBDA_FUNCTIONS.generateUploadUrl]: "dist/lambda/generateUploadUrl.handler",
  [LAMBDA_FUNCTIONS.listVideos]: "dist/lambda/listVideos.handler",
  [LAMBDA_FUNCTIONS.getVideo]: "dist/lambda/getVideo.handler",
  [LAMBDA_FUNCTIONS.verifyUserDocuments]: "dist/lambda/verifyUserDocuments.handler"
};

function buildZip(): Buffer {
  execSync("npx tsc", { cwd: PROJECT_ROOT, stdio: "pipe" });

  const zipPath = path.join(os.tmpdir(), ARTIFACT_KEY);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync(
    `zip -qr "${zipPath}" dist package.json package-lock.json node_modules -x "node_modules/.cache/*" "temp/*" "uploads/*" "public/*"`,
    { cwd: PROJECT_ROOT, stdio: "pipe" }
  );

  return fs.readFileSync(zipPath);
}

async function ensureArtifactBucket(s3: ReturnType<typeof createS3Client>): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: ARTIFACT_BUCKET }));
  } catch (error) {
    const alreadyExists =
      isNamedError(error) &&
      ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(error.name);

    if (!alreadyExists) {
      throw error;
    }
  }
}

async function functionExists(
  lambda: LambdaClient,
  functionName: string
): Promise<boolean> {
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    return true;
  } catch (error) {
    if (isNamedError(error) && error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function waitForActive(
  lambda: LambdaClient,
  functionName: string
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const info = await lambda.send(
      new GetFunctionCommand({ FunctionName: functionName })
    );
    const state = info.Configuration?.State;
    const lastUpdate = info.Configuration?.LastUpdateStatus;

    if (state === "Active" && lastUpdate !== "InProgress") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Lambda ${functionName} did not become Active`);
}

async function sendWithRetry(
  lambda: LambdaClient,
  command: UpdateFunctionCodeCommand | UpdateFunctionConfigurationCommand
): Promise<unknown> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      return await lambda.send(command as never);
    } catch (error) {
      const busy =
        (isNamedError(error) && error.name === "ResourceConflictException") ||
        String(errorMessageSafe(error)).includes("update is in progress");

      if (!busy || attempt === 14) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function errorMessageSafe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function ensureLocalStackLambdas({
  lambda,
  config
}: {
  lambda: LambdaClient;
  config: AppConfig;
}): Promise<void> {
  console.log("[aws-lambda] deploying functions to LocalStack");

  const s3 = createS3Client(config.localstack);
  await ensureArtifactBucket(s3);

  const zip = buildZip();
  await s3.send(
    new PutObjectCommand({
      Bucket: ARTIFACT_BUCKET,
      Key: ARTIFACT_KEY,
      Body: zip
    })
  );

  const environment = {
    Variables: {
      PROFILE: "localstack",
      AWS_REGION: config.localstack.region,
      AWS_ACCESS_KEY_ID: config.localstack.accessKeyId || "test",
      AWS_SECRET_ACCESS_KEY: config.localstack.secretAccessKey || "test",
      S3_BUCKET: config.localstack.bucket,
      S3_PUBLIC_ENDPOINT: config.localstack.publicEndpoint,
      PGHOST:
        config.postgres.host === "localhost"
          ? "host.docker.internal"
          : config.postgres.host,
      PGPORT: String(config.postgres.port),
      PGUSER: config.postgres.user,
      PGPASSWORD: config.postgres.password,
      PGDATABASE: config.postgres.database
    }
  };

  for (const [functionName, handler] of Object.entries(HANDLERS)) {
    const exists = await functionExists(lambda, functionName);

    if (!exists) {
      console.log("[aws-lambda] CreateFunction", { functionName, handler });
      await lambda.send(
        new CreateFunctionCommand({
          FunctionName: functionName,
          Runtime: "nodejs20.x",
          Role: "arn:aws:iam::000000000000:role/lambda-role",
          Handler: handler,
          Timeout: 30,
          Code: {
            S3Bucket: ARTIFACT_BUCKET,
            S3Key: ARTIFACT_KEY
          },
          Environment: environment
        })
      );
    } else {
      await waitForActive(lambda, functionName);
      console.log("[aws-lambda] UpdateFunctionCode", { functionName });
      await sendWithRetry(
        lambda,
        new UpdateFunctionCodeCommand({
          FunctionName: functionName,
          S3Bucket: ARTIFACT_BUCKET,
          S3Key: ARTIFACT_KEY
        })
      );
      await waitForActive(lambda, functionName);
      await sendWithRetry(
        lambda,
        new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Environment: environment
        })
      );
    }

    await waitForActive(lambda, functionName);
    console.log("[aws-lambda] function ready", { functionName });
  }
}
