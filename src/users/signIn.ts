import { HttpStatus } from "../enums";
import { HttpError, NotFoundError } from "../errors";
import { normalizeEmail } from "./resolveUser";
import type { SignInInput, UserProfile, UserStore } from "../types";

export async function signIn(
  users: UserStore,
  { email, phone }: SignInInput
): Promise<UserProfile> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new HttpError(HttpStatus.BadRequest, "email is required");
  }

  const user = await users.findByEmail(normalizedEmail);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (phone && user.phone && String(phone).trim() !== user.phone) {
    throw new HttpError(HttpStatus.Unauthorized, "Phone does not match");
  }

  return user;
}
