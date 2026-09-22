import { loadConfig } from "../config";
import { createStorageDependencies } from "../createStorage";
import { createPostgresPool } from "../infrastructure/createPostgresPool";
import { PostgresUserStore } from "../users/PostgresUserStore";
import { createRekognition } from "../infrastructure/createRekognition";
import type { LambdaRuntime } from "../types";

let runtimePromise: Promise<LambdaRuntime> | undefined;

export async function getLambdaRuntime(): Promise<LambdaRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const config = loadConfig();
      const deps = createStorageDependencies(config);
      await deps.storage.init();

      const users = new PostgresUserStore({
        pool: createPostgresPool(config)
      });
      await users.init();

      const rekognition = createRekognition(config);

      return {
        config,
        users,
        rekognition,
        ...deps
      };
    })();
  }

  return runtimePromise;
}
