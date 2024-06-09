use util::constants::IMMUNISATION_CONTEXT_ID;

use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TABLE program ALTER COLUMN master_list_id DROP NOT NULL;
            ALTER TABLE program ADD COLUMN IF NOT EXISTS is_immunisation BOOLEAN NOT NULL DEFAULT false;
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
            CREATE TABLE tmp_program (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT,
                name TEXT NOT NULL,
                context_id TEXT NOT NULL,
                is_immunisation BOOLEAN NOT NULL
            );
            INSERT INTO tmp_program SELECT id, master_list_id, name, context_id, false FROM program;
            DROP TABLE program;
            CREATE TABLE program (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT,
                name TEXT NOT NULL,
                context_id TEXT NOT NULL,
                is_immunisation BOOLEAN NOT NULL
            );
            INSERT INTO program SELECT id, master_list_id, name, context_id, is_immunisation FROM tmp_program;
            DROP TABLE tmp_program;
        "#
        )?;
    }

    sql!(
        connection,
        "INSERT INTO context (id, name) VALUES('{}', 'Immunisation context');",
        IMMUNISATION_CONTEXT_ID
    )?;

    Ok(())
}
