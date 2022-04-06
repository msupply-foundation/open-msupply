-- Create name table.

CREATE TABLE name (
    id TEXT NOT NULL PRIMARY KEY,
    -- Human-readable representation of the entity associated with the name record.
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_customer BOOLEAN NOT NULL,
    is_supplier BOOLEAN NOT NULL,
    -- TODO, this is temporary, remove
    legacy_record TEXT NOT NULL
)
