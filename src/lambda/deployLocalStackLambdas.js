const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const {
  CreateFunctionCommand,
  GetFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand
} = require("@aws-sdk/client-lambda");
const {
  CreateBucketCommand,
  PutObjectCommand
} = require("@aws-sdk/client-s3");
const { createS3Client } = require("../infrastructure/createS3Client");
const { LAMBDA_FUNCTIONS } = require("./functionNames");

const ARTIFACT_BUCKET = "lambda-artifacts";
const ARTIFACT_KEY = "video-lambdas.zip";
const PROJECT_ROOT = path.join(__dirname, "../..");

const HANDLERS = {
  [LAMBDA_FUNCTIONS.generateUploadUrl]: "src/lambda/generateUploadUrl.handler",
  [LAMBDA_FUNCTIONS.listVideos]: "src/lambda/listVideos.handler",
  [LAMBDA_FUNCTIONS.getVideo]: "src/lambda/getVideo.handler"
};

function buildZip() {
  const zipPath = path.join(os.tmpdir(), ARTIFACT_KEY);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync(
    `zip -qr "${zipPath}" src package.json package-lock.json node_modules -x "node_modules/.cache/*" "temp/*" "uploads/*" "public/*"`,
    { cwd: PROJECT_ROOT, stdio: "pipe" }
  );

  return fs.readFileSync(zipPath);
}

async function ensureArtifactBucket(s3) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: ARTIFACT_BUCKET }));
  } catch (error) {
    const alreadyExists = [
      "BucketAlreadyOwnedByYou",
      "BucketAlreadyExists"
    ].includes(error.name);

    if (!alreadyExists) {
      throw error;
    }
  }
}

async function functionExists(lambda, functionName) {
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function waitForActive(lambda, functionName) {
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

async function sendWithRetry(lambda, command) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      return await lambda.send(command);
    } catch (error) {
      const busy =
        error.name === "ResourceConflictException" ||
        String(error.message || "").includes("update is in progress");

      if (!busy || attempt === 14) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function ensureLocalStackLambdas({ lambda, config }) {
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
      AWS_ACCESS_KEY_ID: config.localstack.accessKeyId,
      AWS_SECRET_ACCESS_KEY: config.localstack.secretAccessKey,
      S3_BUCKET: config.localstack.bucket,
      S3_PUBLIC_ENDPOINT: config.localstack.publicEndpoint
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

module.exports = {
  ensureLocalStackLambdas
};
