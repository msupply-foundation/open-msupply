use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "restore_stocktake_line_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // stocktake_line lost every index it had on SQLite in 2.8.0. The SQLite
        // branch of `v2_08_00::migrate_reason_option_ids` rebuilds the table —
        // RENAME TO stocktake_line_old, CREATE TABLE, copy, DROP TABLE — and the
        // indexes were dropped along with the renamed table, never re-created.
        // Postgres took the ALTER TABLE branch of the same fragment and kept all
        // four, so since 2.8.0 every SQLite site has scanned the whole table on
        // every read of a stocktake's lines. These are the four Postgres carries.
        //
        // IF NOT EXISTS rather than a SQLite-only branch, because the names below
        // are the ones Postgres already uses, so this is a no-op there — and stays
        // one on a fresh datafile once `sqlite_latest.sql` is next regenerated
        // from a base version above 3.02.0 and carries them itself.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_stocktake_line_stocktake_id_fkey
                ON stocktake_line (stocktake_id);
            CREATE INDEX IF NOT EXISTS index_stocktake_line_item_link_id_fkey
                ON stocktake_line (item_link_id);
            CREATE INDEX IF NOT EXISTS index_stocktake_line_location_id_fkey
                ON stocktake_line (location_id);
            CREATE INDEX IF NOT EXISTS index_stocktake_line_stock_line_id_fkey
                ON stocktake_line (stock_line_id);
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{prelude::*, sql_query, sql_types::Text};

    #[actix_rt::test]
    async fn migration_restore_stocktake_line_indexes() {
        // Migration tests initialise from the *earliest* base schema, so this
        // starts on a datafile that had the four indexes, loses them at 2.8.0,
        // and must have them back by the end — the regression end to end rather
        // than a bare assertion that the CREATE statements ran.
        let previous_version = v3_00_00::V3_00_00.version();
        let version = v3_02_00::V3_02_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_restore_stocktake_line_indexes"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        #[derive(QueryableByName)]
        struct NameRow {
            #[diesel(sql_type = Text)]
            name: String,
        }
        let index_lookup = if cfg!(feature = "postgres") {
            "SELECT indexname AS name FROM pg_indexes WHERE tablename = 'stocktake_line' AND indexname = $1"
        } else {
            "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'stocktake_line' AND name = $1"
        };
        let exists = |name: &str| -> bool {
            sql_query(index_lookup)
                .bind::<Text, _>(name)
                .get_result::<NameRow>(connection.lock().connection())
                .optional()
                .unwrap()
                .map(|r| r.name)
                .is_some()
        };

        let indexes = [
            "index_stocktake_line_stocktake_id_fkey",
            "index_stocktake_line_item_link_id_fkey",
            "index_stocktake_line_location_id_fkey",
            "index_stocktake_line_stock_line_id_fkey",
        ];

        // SQLite only: on Postgres the indexes survived 2.8.0, so there is no
        // "before" state to assert. This is the state the ticket describes.
        if !cfg!(feature = "postgres") {
            for index in indexes {
                assert!(!exists(index), "{} should not exist before 3.02.0", index);
            }
        }

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        for index in indexes {
            assert!(exists(index), "{} should exist after 3.02.0", index);
        }
    }
}
