use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_message_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Store-to-store messaging (local-only in this iteration; not sync-replicated).
        // A message belongs to a group of recipient stores; each recipient row also
        // carries that recipient's read state (read_datetime NULL = unread).

        let kind_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"CREATE TYPE message_kind AS ENUM ('GLOBAL', 'BY_RECORD');"#
            )?;
            "message_kind"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE message_group (
                    id TEXT NOT NULL PRIMARY KEY,
                    all_stores BOOLEAN NOT NULL DEFAULT FALSE
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TABLE message (
                    id TEXT NOT NULL PRIMARY KEY,
                    group_id TEXT NOT NULL REFERENCES message_group(id),
                    kind {kind_type} NOT NULL,
                    body TEXT NOT NULL,
                    sender_store_id TEXT NOT NULL REFERENCES store(id),
                    sent_by_user_id TEXT NOT NULL,
                    sent_datetime {DATETIME} NOT NULL,
                    record_kind TEXT,
                    record_id TEXT
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TABLE message_recipient (
                    id TEXT NOT NULL PRIMARY KEY,
                    group_id TEXT NOT NULL REFERENCES message_group(id),
                    store_id TEXT NOT NULL REFERENCES store(id),
                    read_datetime {DATETIME}
                );
            "#
        )?;

        // Read paths: messages a store sent or received, newest first; unread counts.
        sql!(
            connection,
            r#"
                CREATE INDEX index_message_sender_store_id ON message (sender_store_id);
                CREATE INDEX index_message_group_id ON message (group_id);
                CREATE INDEX index_message_record_id ON message (record_id);
                CREATE INDEX index_message_recipient_store_id ON message_recipient (store_id);
                CREATE INDEX index_message_recipient_group_id ON message_recipient (group_id);
            "#
        )?;

        Ok(())
    }
}
