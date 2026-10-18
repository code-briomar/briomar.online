-- D1 SQLite Database Schema for briomar.online

CREATE TABLE IF NOT EXISTS post_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    voter_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_ratings_post_id ON post_ratings(post_id);

CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_handle TEXT,
    score INTEGER,
    comment_body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
