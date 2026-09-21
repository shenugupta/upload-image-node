const path = require("path");
const { HttpError } = require("../errors");

const ALLOWED_FILE_TYPES = ["png", "jpeg", "video", "mov"];

function fileTypeFromUpload({ fileName, contentType }) {
  const ext = path.extname(String(fileName || "")).toLowerCase().replace(".", "");
  const type = String(contentType || "").toLowerCase();

  if (type === "image/png" || ext === "png") {
    return "png";
  }

  if (type === "image/jpeg" || type === "image/jpg" || ext === "jpeg" || ext === "jpg") {
    return "jpeg";
  }

  if (type === "video/quicktime" || ext === "mov") {
    return "mov";
  }

  if (type.startsWith("video/") || ["mp4", "webm", "mkv", "avi"].includes(ext)) {
    return "video";
  }

  throw new HttpError(
    400,
    `filetype must be ${ALLOWED_FILE_TYPES.join(", ")}`
  );
}

module.exports = {
  ALLOWED_FILE_TYPES,
  fileTypeFromUpload
};
