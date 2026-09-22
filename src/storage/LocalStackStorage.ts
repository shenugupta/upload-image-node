import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketCorsCommand,
  type S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AwsErrorName, HttpMethod, Profile } from "../enums";
import { StoragePort } from "../ports/StoragePort";
import { NotFoundError, errorMessage, isNamedError } from "../errors";
import type { CaughtError, CreateUploadUrlInput, ListedObject, StorageKeyInput, UploadUrlResult, VideoResult } from "../types";

export type S3StorageOptions = {
  s3: S3Client;
  bucket: string;
  expiresIn: number;
  endpoint?: string;
  publicEndpoint?: string;
  profile?: Profile;
  manageBucket?: boolean;
};

export class LocalStackStorage extends StoragePort {
  profile: Profile;
  bucket: string;
  s3: S3Client;
  expiresIn: number;
  endpoint?: string;
  publicEndpoint?: string;
  manageBucket: boolean;

  constructor({
    s3,
    bucket,
    expiresIn,
    endpoint,
    publicEndpoint,
    profile = Profile.Localstack,
    manageBucket = true
  }: S3StorageOptions) {
    super();
    this.profile = profile;
    this.s3 = s3;
    this.bucket = bucket;
    this.expiresIn = expiresIn;
    this.endpoint = endpoint;
    this.publicEndpoint = publicEndpoint;
    this.manageBucket = manageBucket;
  }

  toPublicUrl(url: string): string {
    if (!this.publicEndpoint) {
      return url;
    }

    const signed = new URL(url);
    const pub = new URL(this.publicEndpoint);
    signed.protocol = pub.protocol;
    signed.host = pub.host;
    return signed.toString();
  }

  isNotFound(error: CaughtError): boolean {
    if (!isNamedError(error)) {
      return false;
    }

    return (
      error.name === AwsErrorName.NotFound ||
      error.name === AwsErrorName.NoSuchKey ||
      error.$metadata?.httpStatusCode === 404
    );
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const alreadyExists =
        isNamedError(error) &&
        [AwsErrorName.BucketAlreadyOwnedByYou, AwsErrorName.BucketAlreadyExists].includes(
          error.name as AwsErrorName
        );

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
              AllowedMethods: [HttpMethod.Get, HttpMethod.Put, HttpMethod.Post, HttpMethod.Head],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3000
            }
          ]
        }
      })
    );
  }

  async assertBucket(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      throw new Error(
        `AWS S3 bucket "${this.bucket}" is missing or not accessible: ${errorMessage(error)}`
      );
    }
  }

  async ready(): Promise<void> {
    if (this.manageBucket) {
      await this.ensureBucket();
      return;
    }

    await this.assertBucket();
  }

  async init(): Promise<void> {
    await this.ready();
  }

  async createUploadUrl({
    key,
    contentType
  }: CreateUploadUrlInput): Promise<UploadUrlResult> {
    await this.ready();

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

  async getVideo({ key }: StorageKeyInput): Promise<VideoResult> {
    await this.ready();

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

  async listVideos(): Promise<ListedObject[]> {
    await this.ready();

    const listed = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: "uploads/"
      })
    );

    return (listed.Contents || []).map((item) => ({
      key: item.Key || "",
      size: item.Size,
      lastModified: item.LastModified
    }));
  }

  async getObjectBytes({ key }: StorageKeyInput): Promise<Buffer> {
    await this.ready();

    try {
      const object = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );

      if (!object.Body) {
        return Buffer.alloc(0);
      }

      return Buffer.from(await object.Body.transformToByteArray());
    } catch (error) {
      if (this.isNotFound(error)) {
        throw new NotFoundError();
      }
      throw error;
    }
  }

  describe(): string[] {
    if (this.profile === Profile.Aws) {
      return [`AWS S3 bucket: ${this.bucket}`];
    }

    return [
      `LocalStack S3 endpoint: ${this.endpoint}`,
      `S3 bucket: ${this.bucket}`
    ];
  }
}
