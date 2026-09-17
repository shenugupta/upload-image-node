const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketCorsCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { NotFoundError } = require("../errors");

function createLocalstackStorage(config) {
  const { region, endpoint, bucket, accessKeyId, secretAccessKey } =
    config.localstack;
  const expiresIn = config.expiresIn;

  const s3 = new S3Client({
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

  async function ensureBucket() {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const alreadyExists = [
        "BucketAlreadyOwnedByYou",
        "BucketAlreadyExists"
      ].includes(error.name);

      if (!alreadyExists) {
        throw error;
      }
    }

    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3000
            }
          ]
        }
      })
    );
  }

  function isNotFound(error) {
    return (
      error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    );
  }

  return {
    profile: "localstack",
    bucket,
    supportsDirectUpload: false,

    async init() {
      await ensureBucket();
    },

    async createUploadUrl({ key, contentType }) {
      await ensureBucket();

      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType
        }),
        { expiresIn }
      );

      return {
        url,
        key,
        bucket,
        expires: Math.floor(Date.now() / 1000) + expiresIn
      };
    },

    async getVideo({ key }) {
      await ensureBucket();

      let metadata;
      try {
        metadata = await s3.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key
          })
        );
      } catch (error) {
        if (isNotFound(error)) {
          throw new NotFoundError();
        }
        throw error;
      }

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key
        }),
        { expiresIn }
      );

      return {
        url,
        key,
        bucket,
        contentType: metadata.ContentType,
        contentLength: metadata.ContentLength,
        expires: Math.floor(Date.now() / 1000) + expiresIn
      };
    },

    async listVideos() {
      await ensureBucket();

      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: "uploads/"
        })
      );

      return (listed.Contents || []).map((item) => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      }));
    },

    async getDownloadUrl({ key }) {
      return this.getVideo({ key });
    }
  };
}

module.exports = {
  createLocalstackStorage
};
