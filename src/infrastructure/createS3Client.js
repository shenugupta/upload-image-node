const { S3Client } = require("@aws-sdk/client-s3");

function createS3Client({ region, endpoint, accessKeyId, secretAccessKey }) {
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

module.exports = {
  createS3Client
};
