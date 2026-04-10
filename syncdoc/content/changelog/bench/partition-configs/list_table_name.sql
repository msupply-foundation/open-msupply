-- List partition by table_name, one partition per known value + DEFAULT
-- @list_partitions: key=table_name

CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
) PARTITION BY LIST (table_name);

ALTER TABLE changelog ADD PRIMARY KEY (cursor, table_name);
