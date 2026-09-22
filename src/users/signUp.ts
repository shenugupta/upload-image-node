import { HttpError } from "../errors";
import { normalizeEmail } from "./resolveUser";
import type { UserProfile, UserStore } from "../types";

export async function signUp(
  users: UserStore,
  { name, email, phone }: { name?: string; email?: string; phone?: string }
): Promise<UserProfile> {
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
