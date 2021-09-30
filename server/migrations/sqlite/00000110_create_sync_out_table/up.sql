-- Create sync_out table.

CREATE TABLE sync_out (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TEXT NOT NULL,
    table_name TEXT CHECK(table_name IN (
        'requisition',
        'requisition_line',
        'item',
        'stock_line',
        'invoice',
        'invoice_line',
        'name',
        'store')) NOT NULL,
    record_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    site_id INTEGER NOT NULL,
    action TEXT CHECK(action IN ('insert', 'update', 'delete', 'patch')) NOT NULL,
    FOREIGN KEY(store_id) REFERENCES store(id)
)
