const { HttpError, NotFoundError } = require("../errors");

class PostgresUserStore {
  constructor({ pool }) {
    this.pool = pool;
  }

  async init() {
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
        filetype TEXT NOT NULL CHECK (filetype IN ('png', 'jpeg', 'video', 'mov')),
        filename TEXT NOT NULL,
        fileurl TEXT NOT NULL,
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
      CREATE INDEX IF NOT EXISTS "userFiles_userid_idx" ON "userFiles" (userid)
    `);
  }

  async findByEmail(email) {
    const result = await this.pool.query(
      'SELECT id, name, email, phone FROM "userProfile" WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT id, name, email, phone FROM "userProfile" WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async createFile({ filename, filetype, fileurl, userid }) {
    try {
      const result = await this.pool.query(
        `INSERT INTO "userFiles" (filetype, filename, fileurl, userid)
         VALUES ($1, $2, $3, $4)
         RETURNING id, filetype, filename, fileurl, is_verified, userid`,
        [filetype, filename, fileurl, userid]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23503") {
        throw new NotFoundError("User not found");
      }

      if (error.code === "23514") {
        throw new HttpError(400, "filetype must be png, jpeg, video, or mov");
      }

      throw error;
    }
  }

  async create({ name, email, phone }) {
    try {
      const result = await this.pool.query(
        `INSERT INTO "userProfile" (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, phone`,
        [name, email, phone]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new HttpError(409, "Email already exists");
      }

      throw error;
    }
  }
}

module.exports = {
  PostgresUserStore
};
