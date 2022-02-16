CREATE TABLE name_store_join (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL REFERENCES name(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    name_is_customer BOOLEAN NOT NULL,
    name_is_supplier BOOLEAN NOT NULL
)