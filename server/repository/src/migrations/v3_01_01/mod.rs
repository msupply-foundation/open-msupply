use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_frontend_plugin_host_runtime;
mod populate_missing_changelog_for_form_schema;
mod relog_changelog_dropped_by_v6_push_filter;

pub(crate) struct V3_01_01;
impl Migration for V3_01_01 {
    fn version(&self) -> Version {
        Version::from_str("3.1.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        // The first two originally shipped in the 3.0.0 folder but only from v3.01.00 onwards,
        // so a database last run by v3.00.01 (stamped 3.0.1, above 3.0.0) never got them.
        // They live here, above every shipped version, and each is safe to run twice.
        vec![
            Box::new(add_frontend_plugin_host_runtime::Migrate),
            Box::new(populate_missing_changelog_for_form_schema::Migrate),
            Box::new(relog_changelog_dropped_by_v6_push_filter::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_01_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_00_00::V3_00_00;
        use v3_01_01::V3_01_01;

        let previous_version = V3_00_00.version();
        let version = V3_01_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Run this migration
        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}

#[cfg(test)]
mod upgrade_from_3_0_1 {
    use super::V3_01_01;
    use crate::migrations::{v3_00_00::V3_00_00, *};
    use crate::test_db::*;
    use diesel::prelude::*;

    #[derive(QueryableByName)]
    struct Count {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        count: i64,
    }

    fn count(connection: &StorageConnection, sql: &str) -> i64 {
        diesel::sql_query(sql)
            .get_result::<Count>(connection.lock().connection())
            .unwrap()
            .count
    }

    /// v3.00.01 stamped databases 3.0.1 but shipped without the host_runtime column and the
    /// form_schema changelog backfill. Because the runner only re-checks fragments whose
    /// version is >= the database version, nothing registered under 3.0.0 can reach such a
    /// database; registering under 3.1.1 must.
    #[actix_rt::test]
    async fn fragments_reach_a_database_stamped_3_0_1() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_3_01_01_upgrade_from_3_0_1",
            version: Some(V3_00_00.version()),
            ..Default::default()
        })
        .await;

        // Shape the database the way v3.00.01 left it: stamped 3.0.1, no host_runtime column
        // (the 3.0.0 setup above no longer adds it) and a form_schema row with no changelog.
        let mut raw = connection.lock();
        diesel::sql_query(
            "INSERT INTO form_schema (id, type, json_schema, ui_schema) \
             VALUES ('orphan_schema', 'Patient', '{}', '{}')",
        )
        .execute(raw.connection())
        .unwrap();
        drop(raw);
        set_database_version(&connection, &Version::from_str("3.0.1")).unwrap();

        migrate(
            &connection,
            Some(V3_01_01.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let column_exists = if cfg!(feature = "postgres") {
            "SELECT COUNT(*) AS count FROM information_schema.columns \
             WHERE table_name = 'frontend_plugin' AND column_name = 'host_runtime'"
        } else {
            "SELECT COUNT(*) AS count FROM pragma_table_info('frontend_plugin') \
             WHERE name = 'host_runtime'"
        };
        assert_eq!(count(&connection, column_exists), 1, "host_runtime column");
        assert_eq!(
            count(
                &connection,
                "SELECT COUNT(*) AS count FROM changelog \
                 WHERE table_name = 'form_schema' AND record_id = 'orphan_schema'"
            ),
            1,
            "form_schema changelog row"
        );

        // A database last run by v3.01.00 already has the column (added under 3.0.0) and
        // meets the fragment again under 3.1.1, so it must tolerate a second run.
        super::add_frontend_plugin_host_runtime::Migrate
            .migrate(&connection)
            .unwrap();
        assert_eq!(
            count(&connection, column_exists),
            1,
            "host_runtime column after re-run"
        );
    }
}
