import { HttpStatus, Profile } from "../enums";
import { HttpError, NotFoundError } from "../errors";
import type { ResolveUserInput, UserProfile, UserStore } from "../types";

export function normalizeEmail(email?: string): string {
  return String(email || "").trim().toLowerCase();
}

export async function resolveUser(
  users: UserStore,
  { userId, email }: ResolveUserInput
): Promise<UserProfile> {
  if (userId != null && userId !== "") {
    const id = Number(userId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(HttpStatus.BadRequest, "userId is invalid");
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

  if (process.env.PROFILE === Profile.Mock) {
    return users.ensureMockUser();
  }

  throw new HttpError(HttpStatus.BadRequest, "userId or email is required");
}
