-- Create user_account table.

CREATE TABLE user_account (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Password is stored as salted MD5 hash.
    password TEXT NOT NULL,
    email TEXT
)
