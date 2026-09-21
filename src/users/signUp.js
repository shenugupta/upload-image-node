const { HttpError } = require("../errors");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function signUp(users, { name, email, phone }) {
  const trimmedName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const trimmedPhone = phone == null ? null : String(phone).trim() || null;

  if (!trimmedName || !normalizedEmail) {
    throw new HttpError(400, "name and email are required");
  }

  return users.create({
    name: trimmedName,
    email: normalizedEmail,
    phone: trimmedPhone
  });
}

module.exports = {
  signUp
};
