import type { UrlBuilder } from "../types";

export function createUrlBuilder(publicBaseUrl: string): UrlBuilder {
  return {
    openUrl(key: string) {
      return `${publicBaseUrl}/videos/open?key=${encodeURIComponent(key)}`;
    },
    getVideoUrl(key: string) {
      return `${publicBaseUrl}/get-video?key=${encodeURIComponent(key)}`;
    }
  };
}
