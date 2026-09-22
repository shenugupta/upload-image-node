import path from "path";
import { HttpError } from "../errors";
import type { FileType } from "../types";

export const ALLOWED_FILE_TYPES: FileType[] = ["png", "jpeg", "video", "mov"];

export function fileTypeFromUpload({
  fileName,
  contentType
}: {
  fileName?: string;
  contentType?: string;
}): FileType {
  const ext = path.extname(String(fileName || "")).toLowerCase().replace(".", "");
  const type = String(contentType || "").toLowerCase();

  if (type === "image/png" || ext === "png") {
    return "png";
  }

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    ext === "jpeg" ||
    ext === "jpg"
  ) {
    return "jpeg";
  }

  if (type === "video/quicktime" || ext === "mov") {
    return "mov";
  }

  if (type.startsWith("video/") || ["mp4", "webm", "mkv", "avi"].includes(ext)) {
    return "video";
  }

  throw new HttpError(400, `filetype must be ${ALLOWED_FILE_TYPES.join(", ")}`);
}
