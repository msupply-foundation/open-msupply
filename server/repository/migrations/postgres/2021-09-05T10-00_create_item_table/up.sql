-- Create item table.

CREATE TABLE item
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    unit_id TEXT REFERENCES unit(id),
    type TEXT NOT NULL,
    default_pack_size DOUBLE PRECISION NOT NULL,
    -- TODO, this is temporary, remove
    legacy_record TEXT NOT NULL
)
