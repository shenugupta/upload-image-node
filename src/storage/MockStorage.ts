import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FileExtension, HttpMethod, MimeType, Profile } from "../enums";
import { StoragePort } from "../ports/StoragePort";
import { HttpError, NotFoundError } from "../errors";
import type { ListedObject, UploadUrlResult, VideoResult } from "../types";

function contentTypeFromName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === `.${FileExtension.Mov}`) return MimeType.Quicktime;
  if (ext === `.${FileExtension.Mp4}`) return MimeType.Mp4;
  if (ext === `.${FileExtension.Webm}`) return MimeType.Webm;
  if (ext === `.${FileExtension.Mkv}`) return MimeType.Matroska;
  if (ext === `.${FileExtension.Avi}`) return MimeType.Avi;

  return MimeType.OctetStream;
}

export type MockStorageOptions = {
  secret: string;
  uploadDir: string;
  bucket: string;
  expiresIn: number;
  publicBaseUrl: string;
};

export class MockStorage extends StoragePort {
  profile: Profile = Profile.Mock;
  bucket: string;
  secret: string;
  uploadDir: string;
  expiresIn: number;
  publicBaseUrl: string;

  constructor({
    secret,
    uploadDir,
    bucket,
    expiresIn,
    publicBaseUrl
  }: MockStorageOptions) {
    super();
    this.secret = secret;
    this.uploadDir = uploadDir;
    this.bucket = bucket;
    this.expiresIn = expiresIn;
    this.publicBaseUrl = publicBaseUrl;
  }

  sign(value: string): string {
    return crypto.createHmac("sha256", this.secret).update(value).digest("hex");
  }

  filePathFor(key: string): string {
    return path.join(this.uploadDir, path.basename(key));
  }

  signedUrl(key: string, contentType: string, expires: number, method: string): string {
    const signature = this.sign(`${method}:${key}:${contentType}:${expires}`);

    return (
      `${this.publicBaseUrl}/mock-s3/${encodeURIComponent(key)}` +
      `?expires=${expires}&signature=${signature}&method=${method}` +
      `&contentType=${encodeURIComponent(contentType)}`
    );
  }

  verifySignature({
    key,
    contentType,
    expires,
    signature,
    method
  }: {
    key: string;
    contentType: string;
    expires?: string | number;
    signature?: string;
    method?: string;
  }): void {
    if (!expires || !signature || !method) {
      throw new HttpError(400, "Invalid URL");
    }

    if (Math.floor(Date.now() / 1000) > Number(expires)) {
      throw new HttpError(403, "URL expired");
    }

    const expected = this.sign(`${method}:${key}:${contentType}:${expires}`);

    if (signature !== expected) {
      throw new HttpError(403, "Invalid signature");
    }
  }

  async init(): Promise<void> {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createUploadUrl({
    key,
    contentType
  }: {
    key: string;
    contentType: string;
  }): Promise<UploadUrlResult> {
    const expires = Math.floor(Date.now() / 1000) + this.expiresIn;

    return {
      url: this.signedUrl(key, contentType, expires, HttpMethod.Put),
      key,
      bucket: this.bucket,
      expires
    };
  }

  async putObject({
    key,
    contentType,
    body,
    expires,
    signature,
    method
  }: {
    key: string;
    contentType?: string;
    body: Buffer;
    expires?: string | number;
    signature?: string;
    method?: string;
  }): Promise<void> {
    this.verifySignature({
      key,
      contentType: contentType || MimeType.OctetStream,
      expires,
      signature,
      method: method || HttpMethod.Put
    });

    fs.writeFileSync(this.filePathFor(key), body);
  }

  async getVideo({ key }: { key: string }): Promise<VideoResult> {
    const filePath = this.filePathFor(key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError();
    }

    const stats = fs.statSync(filePath);
    const contentType = contentTypeFromName(key);
    const expires = Math.floor(Date.now() / 1000) + this.expiresIn;

    return {
      url: this.signedUrl(key, contentType, expires, HttpMethod.Get),
      key,
      bucket: this.bucket,
      contentType,
      contentLength: stats.size,
      expires
    };
  }

  async listVideos(): Promise<ListedObject[]> {
    await this.init();

    return fs
      .readdirSync(this.uploadDir)
      .filter((name) => !name.startsWith("."))
      .map((name) => {
        const stats = fs.statSync(path.join(this.uploadDir, name));

        return {
          key: `uploads/${name}`,
          size: stats.size,
          lastModified: stats.mtime
        };
      });
  }

  async readObject({
    key,
    expires,
    signature,
    method,
    contentType
  }: {
    key: string;
    expires?: string | number;
    signature?: string;
    method?: string;
    contentType?: string;
  }): Promise<{ body: Buffer; contentType: string; contentLength: number }> {
    const filePath = this.filePathFor(key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError();
    }

    const resolvedType = contentType || contentTypeFromName(key);

    this.verifySignature({
      key,
      contentType: resolvedType,
      expires,
      signature,
      method: method || HttpMethod.Get
    });

    return {
      body: fs.readFileSync(filePath),
      contentType: resolvedType,
      contentLength: fs.statSync(filePath).size
    };
  }

  async getObjectBytes({ key }: { key: string }): Promise<Buffer> {
    const filePath = this.filePathFor(key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError();
    }

    return fs.readFileSync(filePath);
  }

  describe(): string[] {
    return [`Mock upload directory: ${this.uploadDir}`];
  }
}
