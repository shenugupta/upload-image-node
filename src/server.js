const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

const PORT = 3001;
const SECRET = "local-development-secret";

const uploadDir = path.join(__dirname, "../temp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Generate mock pre-signed URL
app.post("/upload-url", (req, res) => {
  const { fileName, contentType } = req.body;

  if (!fileName || !contentType) {
    return res.status(400).json({
      success: false,
      message: "fileName and contentType are required"
    });
  }

  const key = `uploads/${Date.now()}-${fileName}`;

  const expires = Math.floor(Date.now() / 1000) + 300;

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${key}:${contentType}:${expires}`)
    .digest("hex");

  const url =
    `http://localhost:${PORT}/mock-s3/${encodeURIComponent(key)}` +
    `?expires=${expires}&signature=${signature}`;

  res.json({
    success: true,
    data: {
      url,
      key,
      expires
    }
  });
});

// Receive file using generated URL
app.put("/mock-s3/*key", express.raw({
  type: "*/*",
  limit: "20mb"
}), (req, res) => {

  const key = decodeURIComponent(
    req.path.replace("/mock-s3/", "")
  );

  const expires = Number(req.query.expires);
  const signature = req.query.signature;

  if (!expires || !signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid URL"
    });
  }

  if (Math.floor(Date.now() / 1000) > expires) {
    return res.status(403).json({
      success: false,
      message: "URL expired"
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(
      `${key}:${req.headers["content-type"]}:${expires}`
    )
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(403).json({
      success: false,
      message: "Invalid signature"
    });
  }

  const fileName = path.basename(key);

  const filePath = path.join(
    uploadDir,
    fileName
  );

  fs.writeFileSync(filePath, req.body);

  res.json({
    success: true,
    message: "File uploaded successfully",
    key,
    filePath
  });
});

app.listen(PORT, () => {
  console.log(
    `Local server running at http://localhost:${PORT}`
  );
});