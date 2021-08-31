-- Create user table

CREATE EXTENSION pgcrypto;

CREATE TABLE user_account (
    id varchar(255) NOT NULL PRIMARY KEY,
    username varchar(255) NOT NULL,
    -- Password is stored as salted MD5 hash
    password text NOT NULL,
    email varchar(255)
)
