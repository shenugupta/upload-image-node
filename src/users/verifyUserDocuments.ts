import { keyFromFileUrl } from "./keyFromFileUrl";
import { resolveUser } from "./resolveUser";
import { errorMessage } from "../errors";
import type {
  PublicUserFile,
  RekognitionPort,
  UserFile,
  UserStore,
  VerifyDocumentsInput,
  VerifyUserDocumentsResult
} from "../types";
import type { StoragePort } from "../ports/StoragePort";

function publicFile(file?: UserFile | null): PublicUserFile | null {
  if (!file) {
    return null;
  }

  return {
    filename: file.filename,
    fileurl: file.fileurl,
    filetype: file.filetype,
    doctype: file.doctype,
    is_verified: file.is_verified
  };
}

async function readBytes(
  storage: StoragePort,
  fileurl: string
): Promise<{ key: string | null; bytes: Buffer }> {
  const key = keyFromFileUrl(fileurl);

  if (!key) {
    return { key: null, bytes: Buffer.alloc(0) };
  }

  try {
    return { key, bytes: await storage.getObjectBytes({ key }) };
  } catch (error) {
    console.log("[verifyUserDocuments] file bytes missing", errorMessage(error));
    return { key, bytes: Buffer.alloc(0) };
  }
}

export async function verifyUserDocuments({
  users,
  storage,
  rekognition,
  input = {}
}: {
  users: UserStore;
  storage: StoragePort;
  rekognition: RekognitionPort;
  input?: VerifyDocumentsInput;
}): Promise<VerifyUserDocumentsResult> {
  const user = await resolveUser(users, input);
  const document = await users.findDocumentForUser(user.id, input.doctype);

  if (!document) {
    return {
      verified: false,
      reason: "PAN or AADHAR document is required",
      document: null,
      selfie: null
    };
  }

  const selfie = await users.findSelfieForUser(user.id);

  if (!selfie) {
    return {
      verified: false,
      reason: "Selfie is required. Upload a png/jpeg with doctype SELFIE",
      document: publicFile(document),
      selfie: null
    };
  }

  const documentFile = await readBytes(storage, document.fileurl);
  const selfieFile = await readBytes(storage, selfie.fileurl);

  const recognition = await rekognition.verifyFaceMatch({
    document: {
      bytes: documentFile.bytes,
      filetype: document.filetype,
      fileurl: document.fileurl,
      key: documentFile.key,
      bucket: storage.bucket,
      doctype: document.doctype
    },
    selfie: {
      bytes: selfieFile.bytes,
      filetype: selfie.filetype,
      fileurl: selfie.fileurl,
      key: selfieFile.key,
      bucket: storage.bucket
    }
  });

  let updated: UserFile[] = [];

  if (recognition.verified) {
    updated = await users.markVerified([document.id, selfie.id]);
  }

  return {
    verified: recognition.verified,
    similarity: recognition.similarity,
    reason: recognition.reason,
    document: publicFile(
      updated.find((row) => row.id === document.id) || document
    ),
    selfie: publicFile(updated.find((row) => row.id === selfie.id) || selfie)
  };
}
