import { HttpError, NotFoundError } from "../errors";
import { normalizeEmail } from "./resolveUser";
import type { UserProfile, UserStore } from "../types";

export async function signIn(
  users: UserStore,
  { email, phone }: { email?: string; phone?: string }
): Promise<UserProfile> {
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
