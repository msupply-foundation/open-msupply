use crate::migrations::*;
use diesel::prelude::*;
use diesel::sql_types::BigInt;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_goods_received"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Skip if the old import_goods_received migration already ran — it created
        // invoices from GR data that would conflict with the new translator approach.
        // Manual work will be needed to clean up those invoices if the old migration ran.
        #[derive(QueryableByName)]
        struct Count {
            #[diesel(sql_type = BigInt)]
            count: i64,
        }

        let result: Count = diesel::sql_query(
            "SELECT COUNT(*) as count FROM migration_fragment_log \
             WHERE version_and_identifier = '2.17.0-import_goods_received'",
        )
        .get_result(connection.lock().connection())?;

        if result.count > 0 {
            log::info!(
                "Skipping reintegrate_goods_received: old import_goods_received migration already ran"
            );
            return Ok(());
        }

        // Reset integration state so the new Goods_received sync translators
        // can process these records (previously no translator existed for them).
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                SET integration_datetime = NULL, integration_error = NULL
                WHERE table_name IN ('Goods_received', 'Goods_received_line')
            "#,
        )?;

        Ok(())
    }
}
