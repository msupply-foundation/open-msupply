-- Create sync_out table.

CREATE TYPE sync_out_action_type AS ENUM ('insert', 'update', 'delete', 'patch');

CREATE TYPE sync_out_table_name AS ENUM ('requisition', 'requisition_line', 'item', 'item_line', 'transact', 'transact_line', 'name', 'store');

CREATE TABLE sync_out (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    created_at DATE NOT NULL,
    table_name sync_out_table_name NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    store_id VARCHAR(255) NOT NULL,
    site_id INTEGER NOT NULL,
    action sync_out_action_type NOT NULL,
)
