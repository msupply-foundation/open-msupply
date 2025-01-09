use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_contact_form_user_account_fk"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Temp fix - user_account record not always available on central server!

        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE contact_form DROP CONSTRAINT contact_form_user_id_fkey;
                "#
            );
            if result.is_err() {
                log::warn!("Failed to drop FK constraint on user_id column of contact_form table, please check name of constraint");
            }
        } else {
            sql!(
                connection,
                r#"
                CREATE TABLE tmp_contact_form (
                    id TEXT NOT NULL PRIMARY KEY,
                    reply_email TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    user_id TEXT NOT NULL,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    contact_type TEXT NOT NULL
                );
                INSERT INTO tmp_contact_form SELECT * FROM contact_form;

                PRAGMA foreign_keys = OFF;
                DROP TABLE contact_form;
                ALTER TABLE tmp_contact_form RENAME TO contact_form;
                PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        sql!(
            connection,
            // Add username so we can use that in emails
            r#"
                ALTER TABLE contact_form ADD username TEXT NOT NULL DEFAULT '';
            "#
        )?;

        Ok(())
    }
}
