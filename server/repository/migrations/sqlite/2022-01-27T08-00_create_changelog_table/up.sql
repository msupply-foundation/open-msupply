CREATE TABLE changelog (
    cursor INTEGER PRIMARY KEY AUTOINCREMENT,
    -- the table name where the change happend
    table_name TEXT NOT NULL,
    -- row id of the modified row
    record_id TEXT NOT NULL,
    -- Sqlite only fires INSERT when doing an upsert (it does a delete + insert) for this reason
    -- use UPSERT.
    row_action TEXT NOT NULL,
    -- Below fields are extracted from associated record where it's deemed necessary (see changelog/README.md)
    name_id TEXT,
    store_id TEXT
);

CREATE VIEW changelog_deduped AS
    SELECT t1.cursor,
        t1.table_name,
        t1.record_id,
        t1.row_action,
        t1.name_id,
        t1.store_id
    FROM changelog t1
    WHERE t1.cursor = (SELECT max(t2.cursor) 
                    from changelog t2
                    where t2.record_id = t1.record_id)
    ORDER BY t1.cursor;