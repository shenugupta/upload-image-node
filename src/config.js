const path = require("path");

function loadConfig(env = process.env) {
  const profile = env.PROFILE;

  if (profile !== "mock" && profile !== "localstack") {
    throw new Error(
      `Unknown PROFILE "${profile || ""}". Use npm run start:mock or npm run start:localstack`
    );
  }

  const port = Number(env.PORT) || 3001;

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
    postgres: {
      host: env.PGHOST || "localhost",
      port: Number(env.PGPORT) || 5432,
      user: env.PGUSER || "postgres",
      password: env.PGPASSWORD || "postgres",
      database: env.PGDATABASE || "upload_app"
    }
  };
}

module.exports = {
  loadConfig
};
