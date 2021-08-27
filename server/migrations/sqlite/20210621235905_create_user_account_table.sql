-- Create user table

CREATE TABLE user_account (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Password is stored as salted MD5 hash
    password text NOT NULL,
    email TEXT
)
