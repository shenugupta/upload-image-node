import path from "path";
import { HttpError } from "../errors";
import { FileExtension, FileType, MimeType } from "../enums";
import type { FileUploadMeta } from "../types";

export const ALLOWED_FILE_TYPES: FileType[] = [
  FileType.Png,
  FileType.Jpeg,
  FileType.Video,
  FileType.Mov
];

const VIDEO_EXTENSIONS = [
  FileExtension.Mp4,
  FileExtension.Webm,
  FileExtension.Mkv,
  FileExtension.Avi
];

export function fileTypeFromUpload({
  fileName,
  contentType
}: FileUploadMeta): FileType {
  const ext = path.extname(String(fileName || "")).toLowerCase().replace(".", "");
  const type = String(contentType || "").toLowerCase();

  if (type === MimeType.Png || ext === FileExtension.Png) {
    return FileType.Png;
  }

  if (
    type === MimeType.Jpeg ||
    type === MimeType.Jpg ||
    ext === FileExtension.Jpeg ||
    ext === FileExtension.Jpg
  ) {
    return FileType.Jpeg;
  }

  if (type === MimeType.Quicktime || ext === FileExtension.Mov) {
    return FileType.Mov;
  }

  if (type.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext as FileExtension)) {
    return FileType.Video;
  }

  throw new HttpError(400, `filetype must be ${ALLOWED_FILE_TYPES.join(", ")}`);
}
