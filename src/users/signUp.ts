import { HttpStatus } from "../enums";
import { HttpError } from "../errors";
import { normalizeEmail } from "./resolveUser";
import type { SignUpInput, UserProfile, UserStore } from "../types";

export async function signUp(
  users: UserStore,
  { name, email, phone }: SignUpInput
): Promise<UserProfile> {
  const trimmedName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const trimmedPhone = phone == null ? null : String(phone).trim() || null;

  if (!trimmedName || !normalizedEmail) {
    throw new HttpError(HttpStatus.BadRequest, "name and email are required");
  }

  return users.create({
    name: trimmedName,
    email: normalizedEmail,
    phone: trimmedPhone
  });
}
