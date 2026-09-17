/**
 * Application storage port.
 * HTTP and use-case code depend on this abstraction, not on mock or LocalStack.
 */
class StoragePort {
  constructor() {
    if (new.target === StoragePort) {
      throw new Error("StoragePort cannot be instantiated directly");
    }
  }

  async init() {
    throw new Error("init() must be implemented");
  }

  async createUploadUrl() {
    throw new Error("createUploadUrl() must be implemented");
  }

  async getVideo() {
    throw new Error("getVideo() must be implemented");
  }

  async listVideos() {
    throw new Error("listVideos() must be implemented");
  }

  async getDownloadUrl({ key }) {
    return this.getVideo({ key });
  }

  describe() {
    return [];
  }
}

module.exports = {
  StoragePort
};
