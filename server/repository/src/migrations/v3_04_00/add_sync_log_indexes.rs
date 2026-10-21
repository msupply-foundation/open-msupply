use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_log_indexes"
    }

    // The app's start-up reads the newest sync log row twice (initialisation
    // status, latest sync status), each ordered exactly as the repository orders
    // them. Without an index that is a scan of the whole table on every page
    // load: 1.8M rows on a site with a long legacy history (#1562).
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_sync_log_started_datetime_id
                ON sync_log (started_datetime DESC, id ASC);
            "#
        )?;

        // The done-datetime sort is DESC NULLS LAST. Postgres puts NULLs first in
        // DESC, so its index must say otherwise; SQLite puts them last already and
        // does not accept NULLS LAST in an index definition.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE INDEX IF NOT EXISTS index_sync_log_finished_datetime_id
                    ON sync_log (finished_datetime DESC NULLS LAST, id ASC);
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                CREATE INDEX IF NOT EXISTS index_sync_log_finished_datetime_id
                    ON sync_log (finished_datetime DESC, id ASC);
                "#
            )?;
        }

        Ok(())
    }
}
