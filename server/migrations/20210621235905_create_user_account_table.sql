-- Create user table.

CREATE EXTENSION pgcrypto;

CREATE TABLE user_account (
    -- Unique id assigned to each user.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- First name of the user.
    first_name VARCHAR(255),
    -- Last name of the user.
    last_name VARCHAR(255),
    -- Email address of the user.
    email VARCHAR(255),
    -- User password, stored as salted MD5 hash.
    password TEXT NOT NULL
)
