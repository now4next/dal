CREATE TABLE reports (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'submitted', body TEXT NOT NULL, review TEXT,
 review_revision INTEGER, file_meta TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT NOT NULL, revision INTEGER NOT NULL,
 kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(report_id) REFERENCES reports(id)
);
CREATE TABLE quotas (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE INDEX reports_queue ON reports(status, updated_at);
CREATE INDEX events_report ON events(report_id,id);
