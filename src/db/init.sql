CREATE TABLE IF NOT EXISTS "userProfile" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS "userFiles" (
  id SERIAL PRIMARY KEY,
  filetype TEXT NOT NULL CHECK (filetype IN ('png', 'jpeg', 'video', 'mov')),
  filename TEXT NOT NULL,
  fileurl TEXT NOT NULL,
  doctype TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  userid INTEGER NOT NULL REFERENCES "userProfile"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "userFiles_userid_idx" ON "userFiles" (userid);
