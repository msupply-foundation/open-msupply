-- Create user_account table.

CREATE TABLE user_account (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Hashed password
    password TEXT NOT NULL,
    email TEXT
)
