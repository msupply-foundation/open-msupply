use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            UPDATE name set is_deceased = false WHERE is_deceased is null;
            ALTER TABLE name ALTER COLUMN is_deceased SET NOT NULL;
            ALTER TABLE name ALTER COLUMN is_deceased SET DEFAULT false;
          "#
        )?;
    }

    // the same as above - but there's no alter column for SQLite
    if cfg!(not(feature = "postgres")) {
        sql!(
            connection,
            r#"
            PRAGMA foreign_keys = 0;

CREATE TABLE temp_table AS SELECT * FROM name;
UPDATE temp_table set is_deceased = false WHERE is_deceased is null;

DROP TABLE name;

CREATE TABLE name (
    id                     TEXT      NOT NULL
                                     PRIMARY KEY,
    name                   TEXT      NOT NULL,
    code                   TEXT      NOT NULL,
    is_customer            BOOLEAN   NOT NULL,
    is_supplier            BOOLEAN   NOT NULL,
    supplying_store_id     TEXT,
    first_name             TEXT,
    last_name              TEXT,
    date_of_birth          TEXT,
    phone                  TEXT,
    charge_code            TEXT,
    comment                TEXT,
    country                TEXT,
    address1               TEXT,
    address2               TEXT,
    email                  TEXT,
    website                TEXT,
    is_manufacturer        BOOLEAN,
    is_donor               BOOLEAN,
    on_hold                BOOLEAN,
    created_datetime       TIMESTAMP,
    type                             NOT NULL
                                     DEFAULT 'FACILITY',
    gender                 TEXT,
    is_deceased            BOOLEAN   NOT NULL
                                     DEFAULT (false),
    national_health_number TEXT,
    date_of_death          DATE,
    custom_data            TEXT      DEFAULT NULL,
    is_sync_update         BOOLEAN   NOT NULL
                                     DEFAULT FALSE
);

INSERT INTO name SELECT * FROM temp_table;

DROP TABLE temp_table;

CREATE INDEX index_name_code ON name ("code");
CREATE INDEX index_name_first_name ON name ("first_name");
CREATE INDEX index_name_last_name ON name ("last_name");
CREATE INDEX index_name_national_health_number ON name ("national_health_number");

CREATE TRIGGER name_insert_trigger
         AFTER INSERT
            ON name
BEGIN
    INSERT INTO changelog (
                              table_name,
                              record_id,
                              row_action,
                              is_sync_update
                          )
                          VALUES (
                              'name',
                              NEW.id,
                              'UPSERT',
                              NEW.is_sync_update
                          );
END;

CREATE TRIGGER name_update_trigger
         AFTER UPDATE
            ON name
BEGIN
    INSERT INTO changelog (
                              table_name,
                              record_id,
                              row_action,
                              is_sync_update
                          )
                          VALUES (
                              'name',
                              NEW.id,
                              'UPSERT',
                              NEW.is_sync_update
                          );
END;

PRAGMA foreign_keys = 1;
            "#
        )?;
    }

    Ok(())
}
