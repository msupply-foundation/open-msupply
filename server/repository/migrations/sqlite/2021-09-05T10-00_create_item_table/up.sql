-- Create item table.

CREATE TABLE item
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    unit_id TEXT REFERENCES unit(id),
    default_pack_size INTEGER NULL,
    type TEXT NOT NULL,
    -- TODO, this is temporary, remove
    legacy_record TEXT NOT NULL
)
