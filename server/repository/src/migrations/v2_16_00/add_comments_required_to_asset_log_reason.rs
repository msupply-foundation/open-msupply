use crate::diesel::RunQueryDsl;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_comments_required_to_asset_log_reason"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE asset_log_reason ADD COLUMN IF NOT EXISTS comments_required BOOLEAN NOT NULL DEFAULT FALSE;
                "#
            )?;
        } else {
            use crate::diesel_helper_types::Count;

            let column_exists: Count = diesel::sql_query(
                "SELECT COUNT(*) as count FROM pragma_table_info('asset_log_reason') WHERE name = 'comments_required'"
            ).get_result(connection.lock().connection())?;

            if column_exists.count == 0 {
                sql!(
                    connection,
                    r#"
                        ALTER TABLE asset_log_reason ADD COLUMN comments_required BOOLEAN NOT NULL DEFAULT FALSE;
                    "#
                )?;
            }
        }

        Ok(())
    }
}
