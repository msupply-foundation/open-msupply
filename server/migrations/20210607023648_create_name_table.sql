-- Create name table.

CREATE TABLE name (
    -- Unique id assigned to each name.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Human-readable representation of the entity associated with the name record.
    name TEXT NOT NULL
)