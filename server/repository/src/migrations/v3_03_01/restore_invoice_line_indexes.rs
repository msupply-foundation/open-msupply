use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "restore_invoice_line_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // invoice_line lost every index it had on SQLite in 2.8.0, the same way
        // stocktake_line did (see v3_02_00::restore_stocktake_line_indexes). The
        // SQLite branch of `v2_08_00::migrate_reason_option_ids` rebuilds the
        // table — RENAME TO invoice_line_old, CREATE TABLE, copy, DROP TABLE — and
        // the indexes were dropped along with the renamed table, never re-created.
        // Postgres took the ALTER TABLE branch and kept all six, so since 2.8.0
        // every stock movement read on SQLite (stock_movement, item_ledger,
        // consumption) has scanned the whole table.
        //
        // Only the four foreign key indexes come back. Postgres also has indexes on
        // `type` and `number_of_packs`, but nearly every line is STOCK_IN or
        // STOCK_OUT with packs > 0, and SQLite sites never run ANALYZE, so without
        // statistics the planner treats `type = ?` as selective and drives every
        // movement query from that index, leaving them as slow as a full scan.
        //
        // IF NOT EXISTS rather than a SQLite-only branch, because the names below
        // are the ones Postgres already uses, so this is a no-op there.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_invoice_line_invoice_id_fkey
                ON invoice_line (invoice_id);
            CREATE INDEX IF NOT EXISTS index_invoice_line_item_link_id_fkey
                ON invoice_line (item_link_id);
            CREATE INDEX IF NOT EXISTS index_invoice_line_location_id_fkey
                ON invoice_line (location_id);
            CREATE INDEX IF NOT EXISTS index_invoice_line_stock_line_id_fkey
                ON invoice_line (stock_line_id);
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
    async fn migration_restore_invoice_line_indexes() {
        // Migration tests initialise from the *earliest* base schema, so this
        // starts on a datafile that had these indexes, loses them at 2.8.0,
        // and must have them back by the end.
        let previous_version = v3_03_00::V3_03_00.version();
        let version = v3_03_01::V3_03_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_restore_invoice_line_indexes"),
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
            "SELECT indexname AS name FROM pg_indexes WHERE tablename = 'invoice_line' AND indexname = $1"
        } else {
            "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'invoice_line' AND name = $1"
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
            "index_invoice_line_invoice_id_fkey",
            "index_invoice_line_item_link_id_fkey",
            "index_invoice_line_location_id_fkey",
            "index_invoice_line_stock_line_id_fkey",
        ];

        // SQLite only: on Postgres the indexes survived 2.8.0, so there is no
        // "before" state to assert. This is the state the ticket describes.
        if !cfg!(feature = "postgres") {
            for index in indexes {
                assert!(!exists(index), "{index} should not exist before 3.3.1");
            }
        }

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        for index in indexes {
            assert!(exists(index), "{index} should exist after 3.3.1");
        }
    }
}
