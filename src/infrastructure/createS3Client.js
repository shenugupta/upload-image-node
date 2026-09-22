const { S3Client } = require("@aws-sdk/client-s3");

function createS3Client({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  sessionToken
}) {
  const client = {
    region
  };

  if (accessKeyId && secretAccessKey) {
    client.credentials = {
      accessKeyId,
      secretAccessKey
    };

    if (sessionToken) {
      client.credentials.sessionToken = sessionToken;
    }
  }

  if (endpoint) {
    client.endpoint = endpoint;
    client.forcePathStyle = true;
    client.requestChecksumCalculation = "WHEN_REQUIRED";
    client.responseChecksumValidation = "WHEN_REQUIRED";
  }

  return new S3Client(client);
}

module.exports = {
  createS3Client
};
