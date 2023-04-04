CREATE TYPE store_mode AS ENUM
(
    'STORE',
    'DISPENSARY'
);

ALTER TABLE store
    ADD COLUMN IF NOT EXISTS "store_mode" store_mode NOT NULL DEFAULT 'STORE';