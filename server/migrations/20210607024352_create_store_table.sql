-- Create store table
CREATE TABLE store (
    id TEXT NOT NULL,
    CONSTRAINT pk_store PRIMARY KEY(id),
    name_id TEXT NOT NULL,
    CONSTRAINT fk_name FOREIGN KEY(name_id) REFERENCES name(id)
)