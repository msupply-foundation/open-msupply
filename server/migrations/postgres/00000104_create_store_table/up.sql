-- Create store table.

CREATE TABLE store (
    id TEXT NOT NULL PRIMARY KEY,
    name_id VARCHAR(255) NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id)
)
