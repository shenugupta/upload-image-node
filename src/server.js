require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketCorsCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const PORT = Number(process.env.PORT) || 3001;
const REGION = process.env.AWS_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:4566";
const BUCKET = process.env.S3_BUCKET || "local-uploads";
const EXPIRES_IN = 300;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test"
  }
});

function openUrlFor(key) {
  return `http://localhost:${PORT}/videos/open?key=${encodeURIComponent(key)}`;
}

async function ensureBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
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
      Bucket: BUCKET,
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

app.post("/upload-url", async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required"
      });
    }

    await ensureBucket();

    const key = `uploads/${Date.now()}-${fileName}`;

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        url,
        openUrl: openUrlFor(key),
        key,
        bucket: BUCKET,
        expires: Math.floor(Date.now() / 1000) + EXPIRES_IN
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate presigned URL from LocalStack",
      error: error.message || error.code || String(error)
    });
  }
});

app.get("/videos", async (req, res) => {
  try {
    await ensureBucket();

    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "uploads/"
      })
    );

    const files = (listed.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      openUrl: openUrlFor(item.Key)
    }));

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list videos from LocalStack",
      error: error.message || error.code || String(error)
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

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key
      }),
      { expiresIn: EXPIRES_IN }
    );

    res.redirect(url);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to open video from LocalStack",
      error: error.message || error.code || String(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
  console.log(`LocalStack S3 endpoint: ${ENDPOINT}`);
  console.log(`S3 bucket: ${BUCKET}`);

  ensureBucket().catch((error) => {
    console.error(
      "LocalStack S3 is not ready yet:",
      error.message || error.code || String(error)
    );
    console.error("Start it with: docker compose up -d");
  });
});
