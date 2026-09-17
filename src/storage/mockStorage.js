const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { NotFoundError } = require("../errors");

function contentTypeFromName(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".mov") return "video/quicktime";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mkv") return "video/x-matroska";
  if (ext === ".avi") return "video/x-msvideo";

  return "application/octet-stream";
}

function createMockStorage(config) {
  const { secret, uploadDir, bucket } = config.mock;
  const expiresIn = config.expiresIn;

  function sign(value) {
    return crypto.createHmac("sha256", secret).update(value).digest("hex");
  }

  function filePathFor(key) {
    return path.join(uploadDir, path.basename(key));
  }

  function signedUrl(key, contentType, expires, method) {
    const signature = sign(`${method}:${key}:${contentType}:${expires}`);

    return (
      `${config.publicBaseUrl}/mock-s3/${encodeURIComponent(key)}` +
      `?expires=${expires}&signature=${signature}&method=${method}` +
      `&contentType=${encodeURIComponent(contentType)}`
    );
  }

  function verifySignature({ key, contentType, expires, signature, method }) {
    if (!expires || !signature || !method) {
      const error = new Error("Invalid URL");
      error.status = 400;
      throw error;
    }

    if (Math.floor(Date.now() / 1000) > Number(expires)) {
      const error = new Error("URL expired");
      error.status = 403;
      throw error;
    }

    const expected = sign(`${method}:${key}:${contentType}:${expires}`);

    if (signature !== expected) {
      const error = new Error("Invalid signature");
      error.status = 403;
      throw error;
    }
  }

  return {
    profile: "mock",
    bucket,
    supportsDirectUpload: true,

    async init() {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    },

    async createUploadUrl({ key, contentType }) {
      const expires = Math.floor(Date.now() / 1000) + expiresIn;

      return {
        url: signedUrl(key, contentType, expires, "PUT"),
        key,
        bucket,
        expires
      };
    },

    async putObject({ key, contentType, body, expires, signature, method }) {
      verifySignature({
        key,
        contentType,
        expires,
        signature,
        method: method || "PUT"
      });

      fs.writeFileSync(filePathFor(key), body);
    },

    async getVideo({ key }) {
      const filePath = filePathFor(key);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError();
      }

      const stats = fs.statSync(filePath);
      const contentType = contentTypeFromName(key);
      const expires = Math.floor(Date.now() / 1000) + expiresIn;

      return {
        url: signedUrl(key, contentType, expires, "GET"),
        key,
        bucket,
        contentType,
        contentLength: stats.size,
        expires
      };
    },

    async listVideos() {
      await this.init();

      return fs
        .readdirSync(uploadDir)
        .filter((name) => !name.startsWith("."))
        .map((name) => {
          const stats = fs.statSync(path.join(uploadDir, name));

          return {
            key: `uploads/${name}`,
            size: stats.size,
            lastModified: stats.mtime
          };
        });
    },

    async getDownloadUrl({ key }) {
      return this.getVideo({ key });
    },

    async readObject({ key, expires, signature, method, contentType }) {
      const filePath = filePathFor(key);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError();
      }

      const resolvedType = contentType || contentTypeFromName(key);

      verifySignature({
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
  };
}

module.exports = {
  createMockStorage
};
