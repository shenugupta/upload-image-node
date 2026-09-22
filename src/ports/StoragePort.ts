import type { ListedObject, Profile, UploadUrlResult, VideoResult } from "../types";

export abstract class StoragePort {
  abstract profile: Profile;
  abstract bucket: string;

  abstract init(): Promise<void>;
  abstract createUploadUrl(input: {
    key: string;
    contentType: string;
  }): Promise<UploadUrlResult>;
  abstract getVideo(input: { key: string }): Promise<VideoResult>;
  abstract listVideos(): Promise<ListedObject[]>;
  abstract getObjectBytes(input: { key: string }): Promise<Buffer>;

  async getDownloadUrl({ key }: { key: string }): Promise<VideoResult> {
    return this.getVideo({ key });
  }

  describe(): string[] {
    return [];
  }
}
