import type { Pool } from "pg";
import { DocType, FileType } from "../enums";
import { HttpError, NotFoundError, isPgError } from "../errors";
import type { CreateFileInput, CreateUserInput, UserFile, UserProfile, UserStore } from "../types";

export class PostgresUserStore implements UserStore {
  pool: Pool;

  constructor({ pool }: { pool: Pool }) {
    this.pool = pool;
  }

  async init(): Promise<void> {
    await this.pool.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL
           AND to_regclass('public."userProfile"') IS NULL THEN
          ALTER TABLE users RENAME TO "userProfile";
        END IF;
      END $$
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "userProfile" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "userFiles" (
        id SERIAL PRIMARY KEY,
        filetype TEXT NOT NULL CHECK (filetype IN ('${FileType.Png}', '${FileType.Jpeg}', '${FileType.Video}', '${FileType.Mov}')),
        filename TEXT NOT NULL,
        fileurl TEXT NOT NULL,
        doctype TEXT NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        userid INTEGER NOT NULL REFERENCES "userProfile"(id) ON DELETE CASCADE
      )
    `);

    await this.pool.query(`
      ALTER TABLE "userFiles" ADD COLUMN IF NOT EXISTS fileurl TEXT
    `);

    await this.pool.query(`
      ALTER TABLE "userFiles"
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false
    `);

    await this.pool.query(`
      ALTER TABLE "userFiles" ADD COLUMN IF NOT EXISTS doctype TEXT
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "userFiles_userid_idx" ON "userFiles" (userid)
    `);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const result = await this.pool.query<UserProfile>(
      'SELECT id, name, email, phone FROM "userProfile" WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  async findById(id: number): Promise<UserProfile | null> {
    const result = await this.pool.query<UserProfile>(
      'SELECT id, name, email, phone FROM "userProfile" WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async ensureMockUser(): Promise<UserProfile> {
    const email = "mock.user@example.com";
    const existing = await this.findByEmail(email);

    if (existing) {
      return existing;
    }

    return this.create({
      name: "Mock User",
      email,
      phone: "0000000000"
    });
  }

  async createFile({
    filename,
    filetype,
    fileurl,
    doctype,
    userid
  }: CreateFileInput): Promise<UserFile> {
    try {
      const result = await this.pool.query<UserFile>(
        `INSERT INTO "userFiles" (filetype, filename, fileurl, doctype, userid)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, filetype, filename, fileurl, doctype, is_verified, userid`,
        [filetype, filename, fileurl, doctype, userid]
      );

      return result.rows[0];
    } catch (error) {
      if (isPgError(error) && error.code === "23503") {
        throw new NotFoundError("User not found");
      }

      if (isPgError(error) && error.code === "23514") {
        throw new HttpError(
          400,
          `filetype must be ${FileType.Png}, ${FileType.Jpeg}, ${FileType.Video}, or ${FileType.Mov}`
        );
      }

      throw error;
    }
  }

  async markVerified(ids: number[]): Promise<UserFile[]> {
    if (!ids.length) {
      return [];
    }

    const result = await this.pool.query<UserFile>(
      `UPDATE "userFiles"
       SET is_verified = true
       WHERE id = ANY($1::int[])
       RETURNING id, filename, fileurl, filetype, doctype, is_verified, userid`,
      [ids]
    );

    return result.rows;
  }

  async findDocumentForUser(
    userid: number,
    doctype?: string
  ): Promise<UserFile | null> {
    const requested = String(doctype || "").trim().toUpperCase();
    const params = [userid];
    let doctypeFilter = `UPPER(doctype) IN ('${DocType.Pan}', '${DocType.Aadhar}', '${DocType.Aadhaar}')`;

    if (requested === DocType.Pan) {
      doctypeFilter = `UPPER(doctype) = '${DocType.Pan}'`;
    } else if (requested === DocType.Aadhar || requested === DocType.Aadhaar) {
      doctypeFilter = `UPPER(doctype) IN ('${DocType.Aadhar}', '${DocType.Aadhaar}')`;
    }

    const result = await this.pool.query<UserFile>(
      `SELECT id, filename, fileurl, filetype, doctype, userid, is_verified
       FROM "userFiles"
       WHERE userid = $1
         AND ${doctypeFilter}
         AND filetype IN ('${FileType.Png}', '${FileType.Jpeg}')
         AND fileurl IS NOT NULL
         AND fileurl <> ''
       ORDER BY CASE WHEN is_verified THEN 1 ELSE 0 END, id DESC
       LIMIT 1`,
      params
    );

    return result.rows[0] || null;
  }

  async findSelfieForUser(userid: number): Promise<UserFile | null> {
    const result = await this.pool.query<UserFile>(
      `SELECT id, filename, fileurl, filetype, doctype, userid, is_verified
       FROM "userFiles"
       WHERE userid = $1
         AND UPPER(doctype) = '${DocType.Selfie}'
         AND filetype IN ('${FileType.Png}', '${FileType.Jpeg}')
         AND fileurl IS NOT NULL
         AND fileurl <> ''
       ORDER BY id DESC
       LIMIT 1`,
      [userid]
    );

    return result.rows[0] || null;
  }

  async create({
    name,
    email,
    phone
  }: CreateUserInput): Promise<UserProfile> {
    try {
      const result = await this.pool.query<UserProfile>(
        `INSERT INTO "userProfile" (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, phone`,
        [name, email, phone]
      );

      return result.rows[0];
    } catch (error) {
      if (isPgError(error) && error.code === "23505") {
        throw new HttpError(409, "Email already exists");
      }

      throw error;
    }
  }
}
