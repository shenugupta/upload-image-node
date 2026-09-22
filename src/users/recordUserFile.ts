import { DocType, Profile } from "../enums";
import { HttpError } from "../errors";
import { fileTypeFromUpload } from "./fileTypeFromUpload";
import { resolveUser } from "./resolveUser";
import type { UserFile, UserStore } from "../types";

function normalizeDoctype(doctype: string | undefined, profile?: string): string {
  const trimmed = String(doctype || "").trim();

  if (trimmed) {
    return trimmed;
  }

  if (profile === Profile.Mock) {
    return DocType.Other;
  }

  throw new HttpError(400, "doctype is required");
}

export async function recordUserFile(
  users: UserStore,
  {
    userId,
    email,
    fileName,
    contentType,
    fileurl,
    doctype
  }: {
    userId?: string | number;
    email?: string;
    fileName?: string;
    contentType?: string;
    fileurl?: string;
    doctype?: string;
  }
): Promise<UserFile> {
  const user = await resolveUser(users, { userId, email });

  if (!fileurl) {
    throw new HttpError(400, "fileurl is required");
  }

  const trimmedDoctype = normalizeDoctype(doctype, process.env.PROFILE);
  const filetype = fileTypeFromUpload({ fileName, contentType });

  return users.createFile({
    filename: String(fileName || ""),
    filetype,
    fileurl,
    doctype: trimmedDoctype,
    userid: user.id
  });
}
