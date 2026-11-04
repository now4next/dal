CREATE TABLE IF NOT EXISTS briefings (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'active', state TEXT NOT NULL, file_meta TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
