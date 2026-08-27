use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "alter_sqlite_changelog_table_for_syncv7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // SQLite-only counterpart to the Postgres `partition_changelog_by_cursor`
        // migration. Brings the schema in line with the post-partition Postgres
        // shape: drop `name_link_id` (gone from changelog), rename `patient_id`
        // → `patient_link_id`, and drop every secondary index. The indexes are
        // re-created uniformly across both backends in `create_changelog_indexes`,
        // so populate can insert without per-row index maintenance and we end up
        // with the same index set on both backends.
        if cfg!(feature = "postgres") {
            return Ok(());
        }

        sql!(
            connection,
            r#"
            DROP INDEX IF EXISTS index_changelog_name_link_id_fkey;
            DROP INDEX IF EXISTS index_changelog_store_id_fkey;
            DROP INDEX IF EXISTS index_changelog_table_name;
            DROP INDEX IF EXISTS index_changelog_transfer_store_id;
            DROP INDEX IF EXISTS index_changelog_patient_id;
            ALTER TABLE changelog DROP COLUMN name_link_id;
            ALTER TABLE changelog RENAME COLUMN patient_id TO patient_link_id;
            "#
        )?;
        Ok(())
    }
}
