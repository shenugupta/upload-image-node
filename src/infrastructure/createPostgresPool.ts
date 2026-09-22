import { Pool } from "pg";
import type { AppConfig } from "../types";

export function createPostgresPool(config: AppConfig): Pool {
  return new Pool(config.postgres);
}
