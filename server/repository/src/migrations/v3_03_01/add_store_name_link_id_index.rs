use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_name_link_id_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // store.name_link_id has had no index since 2.1.0, on either database.
        // `v2_01_00::store_add_name_link_id_and_is_disabled` dropped
        // index_store_name_id_fkey when it replaced name_id and never created
        // one for the new column. Every StoreRepository query joins name_link
        // on it, and translators look stores up by name once per integrated
        // record, so a central with many stores scans the whole table each time.
        //
        // IF NOT EXISTS so this stays a no-op once a regenerated base schema
        // carries the index itself.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_store_name_link_id_fkey
                ON store (name_link_id);
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
    async fn migration_add_store_name_link_id_index() {
        let previous_version = v3_02_00::V3_02_00.version();
        let version = v3_03_01::V3_03_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_add_store_name_link_id_index"),
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
            "SELECT indexname AS name FROM pg_indexes WHERE tablename = 'store' AND indexname = $1"
        } else {
            "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'store' AND name = $1"
        };
        let exists = |name: &str| -> bool {
            sql_query(index_lookup)
                .bind::<Text, _>(name)
                .get_result::<NameRow>(connection.lock().connection())
                .optional()
                .unwrap()
                .is_some()
        };

        let index = "index_store_name_link_id_fkey";

        assert!(!exists(index), "{index} should not exist before 3.3.1");

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        assert!(exists(index), "{index} should exist after 3.3.1");
    }
}
