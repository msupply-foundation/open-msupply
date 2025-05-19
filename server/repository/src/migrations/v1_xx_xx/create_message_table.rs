use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        CREATE TYPE message_status AS ENUM ('NEW', 'READ', 'PROCESSED', 'FAILED');
        CREATE TYPE message_type AS ENUM ('REQUEST_FIELD_CHANGE', 'NOTIFICATION', 'ALERT', 'INFO');

        CREATE TABLE message (
            id TEXT PRIMARY KEY,
            to_store_id TEXT NOT NULL REFERENCES store(id),
            from_store_id TEXT,
            body TEXT NOT NULL,
            created_date DATE NOT NULL,
            created_time INTEGER NOT NULL,
            status message_status NOT NULL,
            type message_type NOT NULL
        );
        "#
    )?;
    
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        CREATE TABLE message (
            id TEXT PRIMARY KEY,
            to_store_id TEXT NOT NULL REFERENCES store(id),
            from_store_id TEXT,
            body TEXT NOT NULL,
            created_date DATE NOT NULL,
            created_time INTEGER NOT NULL,
            status TEXT CHECK(status IN ('NEW', 'READ', 'PROCESSED', 'FAILED')) NOT NULL,
            type TEXT CHECK(type IN ('REQUEST_FIELD_CHANGE', 'NOTIFICATION', 'ALERT', 'INFO')) NOT NULL
        );
        "#
    )?;

    Ok(())
}
