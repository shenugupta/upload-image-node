export function keyFromFileUrl(fileurl: string): string | null {
  try {
    const parsed = new URL(fileurl, "http://localhost");
    return parsed.searchParams.get("key");
  } catch {
    return null;
  }
}
