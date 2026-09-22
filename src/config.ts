import path from "path";
import type { AppConfig, AwsClientAuth, Profile } from "./types";

function isPlaceholderSecret(value: string | undefined): boolean {
  const trimmed = String(value || "").trim();
  return !trimmed || trimmed === "test";
}

function loadAwsCredentials(env: NodeJS.ProcessEnv): AwsClientAuth {
  if (
    isPlaceholderSecret(env.AWS_ACCESS_KEY_ID) ||
    isPlaceholderSecret(env.AWS_SECRET_ACCESS_KEY)
  ) {
    return {
      region: env.AWS_REGION || "us-east-1",
      accessKeyId: undefined,
      secretAccessKey: undefined,
      sessionToken: undefined
    };
  }

  return {
    region: env.AWS_REGION || "us-east-1",
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const profile = env.PROFILE as Profile | undefined;

  if (profile !== "mock" && profile !== "localstack" && profile !== "aws") {
    throw new Error(
      `Unknown PROFILE "${profile || ""}". Use npm run start:mock, npm run start:localstack, or npm run start:aws`
    );
  }

  const port = Number(env.PORT) || 3001;
  const awsCredentials = loadAwsCredentials(env);

  return {
    profile,
    port,
    expiresIn: 300,
    publicBaseUrl: env.PUBLIC_BASE_URL || `http://localhost:${port}`,
    mock: {
      secret: env.MOCK_SECRET || "local-development-secret",
      uploadDir: path.join(__dirname, "../temp"),
      bucket: "mock-local"
    },
    localstack: {
      region: env.AWS_REGION || "us-east-1",
      endpoint:
        env.S3_ENDPOINT ||
        (env.LOCALSTACK_HOSTNAME
          ? `http://${env.LOCALSTACK_HOSTNAME}:4566`
          : "http://localhost:4566"),
      bucket: env.S3_BUCKET || "local-uploads",
      accessKeyId: env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "test",
      publicEndpoint: env.S3_PUBLIC_ENDPOINT || "http://localhost:4566"
    },
    aws: {
      ...awsCredentials,
      bucket: env.AWS_S3_BUCKET
    },
    postgres: {
      host: env.PGHOST || "localhost",
      port: Number(env.PGPORT) || 5432,
      user: env.PGUSER || "postgres",
      password: env.PGPASSWORD || "postgres",
      database: env.PGDATABASE || "upload_app"
    }
  };
}
