function keyFromFileUrl(fileurl) {
  try {
    const parsed = new URL(fileurl, "http://localhost");
    return parsed.searchParams.get("key");
  } catch (error) {
    return null;
  }
}

module.exports = {
  keyFromFileUrl
};
