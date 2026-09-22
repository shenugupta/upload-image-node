const express = require("express");
const cors = require("cors");
const path = require("path");
const { StoragePort } = require("./ports/StoragePort");
const { HttpError, NotFoundError } = require("./errors");
const { LAMBDA_FUNCTIONS } = require("./lambda/functionNames");
const { signIn } = require("./users/signIn");
const { signUp } = require("./users/signUp");
const { recordUserFile } = require("./users/recordUserFile");

function errorMessage(error) {
  return error.message || error.code || String(error);
}

function fromLambdaError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error.message === "Video not found") {
    return new NotFoundError();
  }

  if (
    error.message === "fileName and contentType are required" ||
    error.message === "key is required"
  ) {
    return new HttpError(400, error.message);
  }

  return error;
}

function sendError(res, storage, error, fallbackMessage) {
  const mapped = fromLambdaError(error);

  if (mapped instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      profile: storage.profile,
      message: mapped.message
    });
  }

  return res.status(mapped.status || 500).json({
    success: false,
    profile: storage.profile,
    message: mapped.message || fallbackMessage,
    error: errorMessage(mapped)
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

function createApp({
  storage,
  urls,
  directUpload = null,
  stepFunctions,
  lambdaInvoker,
  users,
  config
}) {
  if (!(storage instanceof StoragePort)) {
    throw new Error("createApp requires a StoragePort instance");
  }

  if (!lambdaInvoker) {
    throw new Error("createApp requires a lambdaInvoker");
  }

  if (!users) {
    throw new Error("createApp requires a users store");
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
      bucket: storage.bucket,
      lambda:
        storage.profile === "localstack"
          ? "localstack-lambda"
          : "aws-lambda-handler",
      rekognition:
        config.profile === "aws"
          ? "aws-compare-faces"
          : config.profile === "localstack"
            ? "localstack-compare-faces"
            : "mock-compare-faces"
    });
  });

  app.post("/upload-url", async (req, res) => {
    try {
      const { fileName, contentType, userId, email, doctype } = req.body || {};

      if (!fileName || !contentType) {
        return res.status(400).json({
          success: false,
          message: "fileName and contentType are required"
        });
      }

      const data = await lambdaInvoker.invoke(
        LAMBDA_FUNCTIONS.generateUploadUrl,
        { fileName, contentType }
      );

      const file = await recordUserFile(users, {
        userId,
        email,
        fileName,
        contentType,
        fileurl: data.openUrl,
        doctype
      });

      res.json({
        success: true,
        profile: storage.profile,
        data: {
          ...data,
          file
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

      const data = await lambdaInvoker.invoke(LAMBDA_FUNCTIONS.getVideo, {
        key
      });

      res.json({
        success: true,
        profile: storage.profile,
        data
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to get video");
    }
  });

  app.get("/videos", async (req, res) => {
    try {
      const files = await lambdaInvoker.invoke(LAMBDA_FUNCTIONS.listVideos, {});

      res.json({
        success: true,
        profile: storage.profile,
        data: files
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

      const data = await lambdaInvoker.invoke(LAMBDA_FUNCTIONS.getVideo, {
        key
      });
      res.redirect(data.url);
    } catch (error) {
      sendError(res, storage, error, "Failed to open video");
    }
  });

  app.post("/signup", async (req, res) => {
    try {
      const data = await signUp(users, req.body || {});

      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to sign up");
    }
  });

  app.post("/signin", async (req, res) => {
    try {
      const data = await signIn(users, req.body || {});

      res.json({
        success: true,
        data
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to sign in");
    }
  });

  app.post("/verify", async (req, res) => {
    try {
      const result = await lambdaInvoker.invoke(
        LAMBDA_FUNCTIONS.verifyUserDocuments,
        req.body || {}
      );

      res.json({
        success: true,
        profile: storage.profile,
        data: result
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to verify selfie with document");
    }
  });

  app.post("/workflow", async (req, res) => {
    try {
      const { fileName, contentType, userId, email, doctype } = req.body || {};

      if (!fileName || !contentType) {
        return res.status(400).json({
          success: false,
          message: "fileName and contentType are required"
        });
      }

      const result = await stepFunctions.startExecution({
        fileName,
        contentType,
        userId,
        email,
        doctype
      });

      res.json({
        success: true,
        profile: storage.profile,
        data: result
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to start workflow");
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
