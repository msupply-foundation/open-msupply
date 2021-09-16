-- Create master_list_line table.

CREATE TABLE master_list_line (
    id TEXT NOT NULL PRIMARY KEY,
    item_id TEXT NOT NULL,
    master_list_id TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES item(id),
    FOREIGN KEY(master_list_id) REFERENCES master_list(id)
)
