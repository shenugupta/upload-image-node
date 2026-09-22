const {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketCorsCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { StoragePort } = require("../ports/StoragePort");
const { NotFoundError } = require("../errors");

class LocalStackStorage extends StoragePort {
  constructor({ s3, bucket, expiresIn, endpoint, publicEndpoint }) {
    super();
    this.profile = "localstack";
    this.s3 = s3;
    this.bucket = bucket;
    this.expiresIn = expiresIn;
    this.endpoint = endpoint;
    this.publicEndpoint = publicEndpoint || "http://localhost:4566";
  }

  toPublicUrl(url) {
    const signed = new URL(url);
    const pub = new URL(this.publicEndpoint);
    signed.protocol = pub.protocol;
    signed.host = pub.host;
    return signed.toString();
  }

  isNotFound(error) {
    return (
      error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    );
  }

  async ensureBucket() {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const alreadyExists = [
        "BucketAlreadyOwnedByYou",
        "BucketAlreadyExists"
      ].includes(error.name);

      if (!alreadyExists) {
        throw error;
      }
    }

    await this.s3.send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
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

  async init() {
    await this.ensureBucket();
  }

  async createUploadUrl({ key, contentType }) {
    await this.ensureBucket();

    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: this.expiresIn }
    );

    return {
      url: this.toPublicUrl(url),
      key,
      bucket: this.bucket,
      expires: Math.floor(Date.now() / 1000) + this.expiresIn
    };
  }

  async getVideo({ key }) {
    await this.ensureBucket();

    let metadata;
    try {
      metadata = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new NotFoundError();
      }
      throw error;
    }

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }),
      { expiresIn: this.expiresIn }
    );

    return {
      url: this.toPublicUrl(url),
      key,
      bucket: this.bucket,
      contentType: metadata.ContentType,
      contentLength: metadata.ContentLength,
      expires: Math.floor(Date.now() / 1000) + this.expiresIn
    };
  }

  async listVideos() {
    await this.ensureBucket();

    const listed = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: "uploads/"
      })
    );

    return (listed.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified
    }));
  }

  async getObjectBytes({ key }) {
    await this.ensureBucket();

    try {
      const object = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );

      return Buffer.from(await object.Body.transformToByteArray());
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new NotFoundError();
      }
      throw error;
    }
  }

  describe() {
    return [
      `LocalStack S3 endpoint: ${this.endpoint}`,
      `S3 bucket: ${this.bucket}`
    ];
  }
}

module.exports = {
  LocalStackStorage
};
