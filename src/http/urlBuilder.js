function createUrlBuilder(publicBaseUrl) {
  return {
    openUrl(key) {
      return `${publicBaseUrl}/videos/open?key=${encodeURIComponent(key)}`;
    },
    getVideoUrl(key) {
      return `${publicBaseUrl}/get-video?key=${encodeURIComponent(key)}`;
    }
  };
}

module.exports = {
  createUrlBuilder
};
