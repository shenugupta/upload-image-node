import express, {
  type Express,
  type Request,
  type Response
} from "express";
import cors from "cors";
import path from "path";
import { HttpMethod, LambdaInvokerKind, Profile, RekognitionMode } from "./enums";
import { StoragePort } from "./ports/StoragePort";
import { HttpError, NotFoundError, errorMessage } from "./errors";
import { LAMBDA_FUNCTIONS } from "./lambda/functionNames";
import { signIn } from "./users/signIn";
import { signUp } from "./users/signUp";
import { recordUserFile } from "./users/recordUserFile";
import { MockStorage } from "./storage/MockStorage";
import type {
  AppConfig,
  CaughtError,
  GenerateUploadUrlResult,
  GetVideoResult,
  LambdaInvoker,
  LambdaPayload,
  ListedVideo,
  QueryParamValue,
  SignInInput,
  SignUpInput,
  UrlBuilder,
  UserStore,
  VerifyUserDocumentsResult
} from "./types";
import type { StepFunctionsRunner } from "./stepfunctions/StepFunctionsRunner";

function asRequestBuffer(body: Buffer | string | undefined): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  return Buffer.from(body || []);
}

function asString(value: QueryParamValue): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function fromLambdaError(error: CaughtError): Error {
  if (error instanceof HttpError) {
    return error;
  }

  const message = errorMessage(error);

  if (message === "Video not found") {
    return new NotFoundError();
  }

  if (
    message === "fileName and contentType are required" ||
    message === "key is required"
  ) {
    return new HttpError(400, message);
  }

  return error instanceof Error ? error : new Error(message);
}

function sendError(
  res: Response,
  storage: StoragePort,
  error: CaughtError,
  fallbackMessage: string
): Response {
  const mapped = fromLambdaError(error);

  if (mapped instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      profile: storage.profile,
      message: mapped.message
    });
  }

  const status = mapped instanceof HttpError ? mapped.status : 500;

  return res.status(status).json({
    success: false,
    profile: storage.profile,
    message: mapped.message || fallbackMessage,
    error: errorMessage(mapped)
  });
}

function mountDirectUploadRoutes(
  app: Express,
  storage: StoragePort,
  directUpload: MockStorage
): void {
  app.put(
    "/mock-s3/*key",
    express.raw({
      type: "*/*",
      limit: "50mb"
    }),
    async (req: Request, res: Response) => {
      try {
        const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));

        await directUpload.putObject({
          key,
          contentType: req.headers["content-type"],
          body: asRequestBuffer(req.body),
          expires: asString(req.query.expires),
          signature: asString(req.query.signature),
          method: asString(req.query.method) || HttpMethod.Put
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

  app.get("/mock-s3/*key", async (req: Request, res: Response) => {
    try {
      const key = decodeURIComponent(req.path.replace("/mock-s3/", ""));
      const object = await directUpload.readObject({
        key,
        expires: asString(req.query.expires),
        signature: asString(req.query.signature),
        method: asString(req.query.method) || HttpMethod.Get,
        contentType: asString(req.query.contentType)
      });

      res.setHeader("Content-Type", object.contentType);
      res.setHeader("Content-Length", object.contentLength);
      res.send(object.body);
    } catch (error) {
      sendError(res, storage, error, "Failed to read file");
    }
  });
}

export function createApp({
  storage,
  urls: _urls,
  directUpload = null,
  stepFunctions,
  lambdaInvoker,
  users,
  config
}: {
  storage: StoragePort;
  urls: UrlBuilder;
  directUpload?: MockStorage | null;
  stepFunctions: StepFunctionsRunner;
  lambdaInvoker: LambdaInvoker;
  users: UserStore;
  config: AppConfig;
}): Express {
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

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      profile: storage.profile,
      port: config.port,
      bucket: storage.bucket,
      lambda:
        storage.profile === Profile.Localstack
          ? LambdaInvokerKind.Localstack
          : LambdaInvokerKind.Handler,
      rekognition:
        config.profile === Profile.Aws
          ? RekognitionMode.Aws
          : config.profile === Profile.Localstack
            ? RekognitionMode.Localstack
            : RekognitionMode.Mock
    });
  });

  app.post("/upload-url", async (req, res) => {
    try {
      const { fileName, contentType, userId, email, doctype }: LambdaPayload =
        req.body || {};

      if (!fileName || !contentType) {
        return res.status(400).json({
          success: false,
          message: "fileName and contentType are required"
        });
      }

      const data = await lambdaInvoker.invoke<GenerateUploadUrlResult>(
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
      const key = asString(req.query.key);

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "key is required"
        });
      }

      const data = await lambdaInvoker.invoke<GetVideoResult>(
        LAMBDA_FUNCTIONS.getVideo,
        { key }
      );

      res.json({
        success: true,
        profile: storage.profile,
        data
      });
    } catch (error) {
      sendError(res, storage, error, "Failed to get video");
    }
  });

  app.get("/videos", async (_req, res) => {
    try {
      const files = await lambdaInvoker.invoke<ListedVideo[]>(
        LAMBDA_FUNCTIONS.listVideos,
        {}
      );

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
      const key = asString(req.query.key);

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "key is required"
        });
      }

      const data = await lambdaInvoker.invoke<GetVideoResult>(
        LAMBDA_FUNCTIONS.getVideo,
        { key }
      );
      res.redirect(data.url);
    } catch (error) {
      sendError(res, storage, error, "Failed to open video");
    }
  });

  app.post("/signup", async (req, res) => {
    try {
      const body: SignUpInput = req.body || {};
      const data = await signUp(users, body);

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
      const body: SignInInput = req.body || {};
      const data = await signIn(users, body);

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
      const body: LambdaPayload = req.body || {};
      const result = await lambdaInvoker.invoke<VerifyUserDocumentsResult>(
        LAMBDA_FUNCTIONS.verifyUserDocuments,
        body
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
      const { fileName, contentType, userId, email, doctype }: LambdaPayload =
        req.body || {};

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

  if (directUpload instanceof MockStorage) {
    mountDirectUploadRoutes(app, storage, directUpload);
  }

  return app;
}
