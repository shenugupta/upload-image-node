const express = require("express");
const cors = require("cors");
const path = require("path");
const { NotFoundError } = require("./errors");

function errorMessage(error) {
  return error.message || error.code || String(error);
}

function createApp({ storage, config }) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../public")));

  function openUrlFor(key) {
    return `${config.publicBaseUrl}/videos/open?key=${encodeURIComponent(key)}`;
  }

  function getVideoUrlFor(key) {
    return `${config.publicBaseUrl}/get-video?key=${encodeURIComponent(key)}`;
  }

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
          openUrl: openUrlFor(key),
          getVideoUrl: getVideoUrlFor(key)
        }
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        profile: storage.profile,
        message: "Failed to generate upload URL",
        error: errorMessage(error)
      });
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
          openUrl: openUrlFor(key)
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          profile: storage.profile,
          message: error.message
        });
      }

      res.status(error.status || 500).json({
        success: false,
        profile: storage.profile,
        message: "Failed to get video",
        error: errorMessage(error)
      });
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
          openUrl: openUrlFor(item.key),
          getVideoUrl: getVideoUrlFor(item.key)
        }))
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        profile: storage.profile,
        message: "Failed to list videos",
        error: errorMessage(error)
      });
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
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          profile: storage.profile,
          message: error.message
        });
      }

      res.status(error.status || 500).json({
        success: false,
        profile: storage.profile,
        message: "Failed to open video",
        error: errorMessage(error)
      });
    }
  });

  if (storage.supportsDirectUpload) {
    app.put(
      "/mock-s3/*key",
      express.raw({
        type: "*/*",
        limit: "50mb"
      }),
      async (req, res) => {
        try {
          const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));

          await storage.putObject({
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
          res.status(error.status || 500).json({
            success: false,
            profile: storage.profile,
            message: error.message || "Failed to upload file"
          });
        }
      }
    );

    app.get("/mock-s3/*key", async (req, res) => {
      try {
        const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));
        const object = await storage.readObject({
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
        if (error instanceof NotFoundError) {
          return res.status(404).json({
            success: false,
            profile: storage.profile,
            message: error.message
          });
        }

        res.status(error.status || 500).json({
          success: false,
          profile: storage.profile,
          message: error.message || "Failed to read file"
        });
      }
    });
  }

  return app;
}

module.exports = {
  createApp
};
