-- Create user_account table.

CREATE EXTENSION pgcrypto;

CREATE TABLE user_account (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    -- Password is stored as salted MD5 hash.
    password TEXT NOT NULL,
    email VARCHAR(255)
)
