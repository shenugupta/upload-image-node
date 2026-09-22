import { HttpError, NotFoundError } from "../errors";
import type { UserProfile, UserStore } from "../types";

export function normalizeEmail(email?: string): string {
  return String(email || "").trim().toLowerCase();
}

export async function resolveUser(
  users: UserStore,
  { userId, email }: { userId?: string | number; email?: string }
): Promise<UserProfile> {
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
