const { HttpError } = require("../errors");
const { fileTypeFromUpload } = require("./fileTypeFromUpload");
const { resolveUser } = require("./resolveUser");

function normalizeDoctype(doctype, profile) {
  const trimmed = String(doctype || "").trim();

  if (trimmed) {
    return trimmed;
  }

  if (profile === "mock") {
    return "OTHER";
  }

  throw new HttpError(400, "doctype is required");
}

async function recordUserFile(users, { userId, email, fileName, contentType, fileurl, doctype }) {
  const user = await resolveUser(users, { userId, email });

  if (!fileurl) {
    throw new HttpError(400, "fileurl is required");
  }

  const trimmedDoctype = normalizeDoctype(doctype, process.env.PROFILE);
  const filetype = fileTypeFromUpload({ fileName, contentType });

  return users.createFile({
    filename: fileName,
    filetype,
    fileurl,
    doctype: trimmedDoctype,
    userid: user.id
  });
}

module.exports = {
  recordUserFile
};
