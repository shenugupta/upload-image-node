const { HttpError, NotFoundError } = require("../errors");
const { fileTypeFromUpload } = require("./fileTypeFromUpload");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function recordUserFile(users, { userId, email, fileName, contentType, fileurl }) {
  let user = null;

  if (userId != null && userId !== "") {
    const id = Number(userId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "userId is invalid");
    }

    user = await users.findById(id);
  } else if (email) {
    user = await users.findByEmail(normalizeEmail(email));
  } else {
    throw new HttpError(400, "userId or email is required");
  }

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!fileurl) {
    throw new HttpError(400, "fileurl is required");
  }

  const filetype = fileTypeFromUpload({ fileName, contentType });

  return users.createFile({
    filename: fileName,
    filetype,
    fileurl,
    userid: user.id
  });
}

module.exports = {
  recordUserFile
};
