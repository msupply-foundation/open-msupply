use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_email_queue_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE email_queue_status_enum AS ENUM (
                    'QUEUED',
                    'SENT',
                    'ERRORED',
                    'FAILED',
                );
                "#
            )?
        }

        let email_queue_status = if cfg!(feature = "postgres") {
            "email_queue_status_enum"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE email_queue (
                    id TEXT NOT NULL PRIMARY KEY,
                    to_address TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    html_body TEXT NOT NULL,
                    text_body TEXT NOT NULL,
                    status {email_queue_status} NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    sent_at TIMESTAMP,
                    retries INTEGER NOT NULL DEFAULT 0,
                    error TEXT,
                );
            "#
        )?;

        Ok(())
    }
}
