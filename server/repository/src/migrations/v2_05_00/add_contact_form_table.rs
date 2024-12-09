use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_contact_form_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE contact_form (
                    id TEXT NOT NULL PRIMARY KEY,
                    reply_email TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    user_id TEXT NOT NULL REFERENCES user_account(id),
                    store_id TEXT NOT NULL REFERENCES store(id),
                    site_id TEXT NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'contact_form';
                "#
            )?;
        }

        Ok(())
    }
}
