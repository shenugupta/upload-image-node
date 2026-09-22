const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { StoragePort } = require("../ports/StoragePort");
const { HttpError, NotFoundError } = require("../errors");

function contentTypeFromName(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".mov") return "video/quicktime";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mkv") return "video/x-matroska";
  if (ext === ".avi") return "video/x-msvideo";

  return "application/octet-stream";
}

class MockStorage extends StoragePort {
  constructor({ secret, uploadDir, bucket, expiresIn, publicBaseUrl }) {
    super();
    this.profile = "mock";
    this.secret = secret;
    this.uploadDir = uploadDir;
    this.bucket = bucket;
    this.expiresIn = expiresIn;
    this.publicBaseUrl = publicBaseUrl;
  }

  sign(value) {
    return crypto.createHmac("sha256", this.secret).update(value).digest("hex");
  }

  filePathFor(key) {
    return path.join(this.uploadDir, path.basename(key));
  }

  signedUrl(key, contentType, expires, method) {
    const signature = this.sign(`${method}:${key}:${contentType}:${expires}`);

    return (
      `${this.publicBaseUrl}/mock-s3/${encodeURIComponent(key)}` +
      `?expires=${expires}&signature=${signature}&method=${method}` +
      `&contentType=${encodeURIComponent(contentType)}`
    );
  }

  verifySignature({ key, contentType, expires, signature, method }) {
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

  async init() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createUploadUrl({ key, contentType }) {
    const expires = Math.floor(Date.now() / 1000) + this.expiresIn;

    return {
      url: this.signedUrl(key, contentType, expires, "PUT"),
      key,
      bucket: this.bucket,
      expires
    };
  }

  async putObject({ key, contentType, body, expires, signature, method }) {
    this.verifySignature({
      key,
      contentType,
      expires,
      signature,
      method: method || "PUT"
    });

    fs.writeFileSync(this.filePathFor(key), body);
  }

  async getVideo({ key }) {
    const filePath = this.filePathFor(key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError();
    }

    const stats = fs.statSync(filePath);
    const contentType = contentTypeFromName(key);
    const expires = Math.floor(Date.now() / 1000) + this.expiresIn;

    return {
      url: this.signedUrl(key, contentType, expires, "GET"),
      key,
      bucket: this.bucket,
      contentType,
      contentLength: stats.size,
      expires
    };
  }

  async listVideos() {
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

  async readObject({ key, expires, signature, method, contentType }) {
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
      method: method || "GET"
    });

    return {
      body: fs.readFileSync(filePath),
      contentType: resolvedType,
      contentLength: fs.statSync(filePath).size
    };
  }

  async getObjectBytes({ key }) {
    const filePath = this.filePathFor(key);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError();
    }

    return fs.readFileSync(filePath);
  }

  describe() {
    return [`Mock upload directory: ${this.uploadDir}`];
  }
}

module.exports = {
  MockStorage
};
