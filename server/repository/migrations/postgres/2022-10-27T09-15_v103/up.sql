CREATE TYPE language_type AS ENUM
(
    'ENGLISH',
    'FRENCH',
    'SPANISH',
    'LAOS',
    'KHMER',
    'PORTUGUESE',
    'RUSSIAN',
    'TETUM'
);

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS "language" language_type NOT NULL DEFAULT 'ENGLISH';

