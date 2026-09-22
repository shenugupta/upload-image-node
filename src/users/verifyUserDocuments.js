const { keyFromFileUrl } = require("./keyFromFileUrl");
const { resolveUser } = require("./resolveUser");

function publicFile(file) {
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

async function readBytes(storage, fileurl) {
  const key = keyFromFileUrl(fileurl);

  if (!key) {
    return { key: null, bytes: Buffer.alloc(0) };
  }

  try {
    return { key, bytes: await storage.getObjectBytes({ key }) };
  } catch (error) {
    console.log("[verifyUserDocuments] file bytes missing", error.message);
    return { key, bytes: Buffer.alloc(0) };
  }
}

async function verifyUserDocuments({ users, storage, rekognition, input = {} }) {
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

  let updated = [];

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

module.exports = {
  verifyUserDocuments
};
