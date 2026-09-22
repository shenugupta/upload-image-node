const { HttpError, NotFoundError } = require("../errors");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function resolveUser(users, { userId, email }) {
  if (userId != null && userId !== "") {
    const id = Number(userId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "userId is invalid");
    }

    const user = await users.findById(id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  if (email) {
    const user = await users.findByEmail(normalizeEmail(email));

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  if (process.env.PROFILE === "mock") {
    return users.ensureMockUser();
  }

  throw new HttpError(400, "userId or email is required");
}

module.exports = {
  normalizeEmail,
  resolveUser
};
