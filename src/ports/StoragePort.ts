import type { ListedObject, Profile, StorageKeyInput, CreateUploadUrlInput, UploadUrlResult, VideoResult } from "../types";

export abstract class StoragePort {
  abstract profile: Profile;
  abstract bucket: string;

  abstract init(): Promise<void>;
  abstract createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult>;
  abstract getVideo(input: StorageKeyInput): Promise<VideoResult>;
  abstract listVideos(): Promise<ListedObject[]>;
  abstract getObjectBytes(input: StorageKeyInput): Promise<Buffer>;

  async getDownloadUrl({ key }: StorageKeyInput): Promise<VideoResult> {
    return this.getVideo({ key });
  }

  describe(): string[] {
    return [];
  }
}
