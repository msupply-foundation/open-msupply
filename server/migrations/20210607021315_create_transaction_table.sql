-- Create transaction table
CREATE TABLE transaction (
    id TEXT NOT NULL,
    constraint pk_transaction PRIMARY KEY(id),
    -- TODO: add foreign key to name table
    name_id TEXT NOT NULL,
    invoice_number INTEGER NOT NULL
)