const { HttpError } = require("../errors");

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
  }

  async findByEmail(email) {
    const result = await this.pool.query(
      'SELECT id, name, email, phone FROM "userProfile" WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
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
