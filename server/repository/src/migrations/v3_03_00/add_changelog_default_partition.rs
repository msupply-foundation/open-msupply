use crate::migrations::*;

/// Adds a DEFAULT (catch-all) partition to `changelog` so an insert above the
/// top range partition lands there instead of failing. The top-up task moves
/// such rows into range partitions.
///
/// `CREATE TABLE … PARTITION OF` takes ACCESS EXCLUSIVE on `changelog`; fine
/// here, nothing inserts during migration.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_changelog_default_partition"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // SQLite has no partitions.
        if !cfg!(feature = "postgres") {
            return Ok(());
        }
        sql!(
            connection,
            "CREATE TABLE changelog_p_default PARTITION OF changelog DEFAULT;"
        )?;
        Ok(())
    }
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use crate::{
        migrations::{v3_02_00::V3_02_00, Migration, MigrationFragment},
        test_db::*,
    };
    use diesel::prelude::*;

    #[derive(QueryableByName)]
    struct TextValue {
        #[diesel(sql_type = diesel::sql_types::Text)]
        value: String,
    }

    /// On a database already partitioned by the 3.00 migration (range
    /// partitions only), the fragment adds the DEFAULT partition and an insert
    /// past the top range partition then succeeds and lands there.
    #[actix_rt::test]
    async fn adds_default_partition_to_already_partitioned_changelog() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_add_changelog_default_partition",
            version: Some(V3_02_00.version()),
            ..Default::default()
        })
        .await;

        super::Migrate.migrate(&connection).unwrap();

        let bound: String = diesel::sql_query(
            "SELECT pg_get_expr(relpartbound, oid) AS value FROM pg_class \
             WHERE relname = 'changelog_p_default'",
        )
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(bound, "DEFAULT");

        // Past any range partition the 3.00 migration created.
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 10000000000)")
            .execute(connection.lock().connection())
            .unwrap();
        diesel::sql_query(
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('unit', 'past-the-top', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        let landed_in: String = diesel::sql_query(
            "SELECT tableoid::regclass::text AS value FROM changelog \
             WHERE record_id = 'past-the-top'",
        )
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(landed_in, "changelog_p_default");
    }
}
