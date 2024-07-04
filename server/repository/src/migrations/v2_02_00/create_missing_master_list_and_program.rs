use crate::{migrations::sql, StorageConnection};
use util::constants::MISSING_PROGRAM;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            INSERT INTO master_list (id, name, code, description, is_active)
            SELECT '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', false
            WHERE NOT EXISTS (SELECT 1 FROM master_list WHERE id = '{MISSING_PROGRAM}');

            INSERT INTO context (id, name)
            SELECT '{MISSING_PROGRAM}', '{MISSING_PROGRAM}'
            WHERE NOT EXISTS (SELECT 1 FROM context WHERE id = '{MISSING_PROGRAM}');

            INSERT INTO program (id, master_list_id, name, context_id, is_immunisation, deleted_datetime)
            SELECT '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', '{MISSING_PROGRAM}', false, NULL
            WHERE NOT EXISTS (SELECT 1 FROM program WHERE id = '{MISSING_PROGRAM}');
        "#
    )?;

    Ok(())
}
