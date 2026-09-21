const { HttpError, NotFoundError } = require("../errors");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function signIn(users, { email, phone }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new HttpError(400, "email is required");
  }

  const user = await users.findByEmail(normalizedEmail);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (phone && user.phone && String(phone).trim() !== user.phone) {
    throw new HttpError(401, "Phone does not match");
  }

  return user;
}

module.exports = {
  signIn
};
