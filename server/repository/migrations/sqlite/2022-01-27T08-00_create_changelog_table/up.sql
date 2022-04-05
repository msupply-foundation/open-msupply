CREATE TABLE changelog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- the table name where the change happend
    table_name TEXT CHECK (table_name IN ('number', 'location', 'stocktake', 'stock_line', 'name_store_join', 'invoice', 'invoice_line', 'stocktake', 'stocktake_line', 'requisition', 'requisition_line')) NOT NULL,
    -- row id of the modified row
    row_id TEXT NOT NULL,
    -- Sqlite only fires INSERT when doing an upsert (it does a delete + insert) for this reason
    -- use UPSERT.
    row_action TEXT CHECK (row_action IN ('UPSERT', 'DELETE')) NOT NULL
);

CREATE VIEW changelog_deduped AS
SELECT max(id) id, table_name, row_id, row_action
    FROM changelog
    GROUP BY table_name, row_id
    ORDER BY id;