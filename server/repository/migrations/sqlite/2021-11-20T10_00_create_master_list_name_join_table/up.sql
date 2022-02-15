-- Create master_list_name_join table.

CREATE TABLE master_list_name_join (
    id TEXT NOT NULL PRIMARY KEY,
    master_list_id TEXT NOT NULL,
    name_id TEXT NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id),
    FOREIGN KEY(master_list_id) REFERENCES master_list(id)
)
