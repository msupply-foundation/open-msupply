-- Create store table.

CREATE TABLE store (
    -- Unique id assigned to each store.
    id TEXT NOT NULL PRIMARY KEY,
    -- Id of name representing the store.
    name_id VARCHAR(255) NOT NULL
)