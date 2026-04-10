-- Hash partition by cursor, 32 partitions
-- @hash_partitions: count=32, key=cursor

CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
) PARTITION BY HASH (cursor);

ALTER TABLE changelog ADD PRIMARY KEY (cursor);
