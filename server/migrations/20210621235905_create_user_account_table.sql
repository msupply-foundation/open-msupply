-- Create user table.

CREATE EXTENSION pgcrypto;

CREATE TABLE user_account (
    -- Unique id assigned to each user.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Unique username associated with this user.
    username VARCHAR(255) NOT NULL,
    -- User password, stored as salted MD5 hash.
    password TEXT NOT NULL,
    -- Email address of the user.
    email VARCHAR(255)
)
