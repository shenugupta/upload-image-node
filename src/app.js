const express = require("express");
const cors = require("cors");
const path = require("path");
const { StoragePort } = require("./ports/StoragePort");
const { NotFoundError } = require("./errors");

function errorMessage(error) {
  return error.message || error.code || String(error);
}

function sendError(res, storage, error, fallbackMessage) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      profile: storage.profile,
      message: error.message
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    profile: storage.profile,
    message: error.message || fallbackMessage,
    error: errorMessage(error)
  });
}

function mountDirectUploadRoutes(app, storage, directUpload) {
  app.put(
    "/mock-s3/*key",
    express.raw({
      type: "*/*",
      limit: "50mb"
    }),
    async (req, res) => {
      try {
        const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));

        await directUpload.putObject({
          key,
          contentType: req.headers["content-type"],
          body: req.body,
          expires: req.query.expires,
          signature: req.query.signature,
          method: req.query.method || "PUT"
        });

        res.json({
          success: true,
          profile: storage.profile,
          message: "File uploaded successfully",
          key
        });
      } catch (error) {
        sendError(res, storage, error, "Failed to upload file");
      }
    }
  );

  app.get("/mock-s3/*key", async (req, res) => {
    try {
      const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));
      const object = await directUpload.readObject({
        key,
        expires: req.query.expires,
        signature: req.query.signature,
        method: req.query.method || "GET",
        contentType: req.query.contentType
      });

      res.setHeader("Content-Type", object.contentType);
      res.setHeader("Content-Length", object.contentLength);
      res.send(object.body);
    } catch (error) {
      sendError(res, storage, error, "Failed to read file");
    }
  });
}

function createApp({ storage, urls, directUpload = null, config }) {
  if (!(storage instanceof StoragePort)) {
    throw new Error("createApp requires a StoragePort instance");
  }

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../public")));

  app.get("/health", (req, res) => {
    res.json({
      success: true,
      profile: storage.profile,
      port: config.port,
      bucket: storage.bucket
    });
  });

  app.post("/upload-url", async (req, res) => {
    try {
      const { fileName, contentType } = req.body;

      if (!fileName || !contentType) {
        return res.status(400).json({
          success: false,
          message: "fileName and contentType are required"
        });
      }

      const key = `uploads/${Date.now()}-${fileName}`;
      const data = await storage.createUploadUrl({ key, contentType });

      res.json({
        success: true,
        profile: storage.profile,
        data: {
          ...data,
          openUrl: urls.openUrl(key),
          getVideoUrl: urls.getVideoUrl(key)
        }
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to generate upload URL");
    }
  });

  app.get("/get-video", async (req, res) => {
    try {
      const { key } = req.query;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "key is required"
        });
      }

      const data = await storage.getVideo({ key });

      res.json({
        success: true,
        profile: storage.profile,
        data: {
          ...data,
          openUrl: urls.openUrl(key)
        }
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to get video");
    }
  });

  app.get("/videos", async (req, res) => {
    try {
      const files = await storage.listVideos();

      res.json({
        success: true,
        profile: storage.profile,
        data: files.map((item) => ({
          ...item,
          openUrl: urls.openUrl(item.key),
          getVideoUrl: urls.getVideoUrl(item.key)
        }))
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to list videos");
    }
  });

  app.get("/videos/open", async (req, res) => {
    try {
      const { key } = req.query;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "key is required"
        });
      }

      const data = await storage.getDownloadUrl({ key });
      res.redirect(data.url);
    } catch (error) {
      sendError(res, storage, error, "Failed to open video");
    }
  });

  if (directUpload) {
    mountDirectUploadRoutes(app, storage, directUpload);
  }

  return app;
}

module.exports = {
  createApp
};
