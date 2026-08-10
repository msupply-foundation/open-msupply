use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_frontend_bundle_processor_cursor"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // A processor with no stored cursor starts at 0 and walks the changelog from the
        // beginning. The frontend_bundle processor listens on `frontend_bundle` AND
        // `sync_file_reference`, and an established site can hold a very large number of
        // the latter — so an unseeded cursor means chewing through the site's entire file
        // history on first start to reach the only rows it can act on, which are all in the
        // future. Seed it so it starts where the work actually is.
        //
        // Seeding to the current end of the changelog skips no bundle, because at this point
        // no bundle can have a changelog row yet: `frontend_bundle` is created by
        // `add_frontend_bundle_table` in this same batch, after the fragments that populate
        // the changelog for v7 tables.
        //
        // A site part-way through an upgrade may well be *holding* a frontend_bundle record —
        // sync could have put one in its sync buffer before the restart — but a buffered
        // record is not an integrated one. Integration runs after migrations, and it is
        // integration that writes the changelog row, which therefore lands beyond this seed
        // and is picked up normally. The buffer is why "seed to the end" is safe rather than
        // merely convenient.
        //
        // Kept apart from `add_sync_file_download_request`, which adds the
        // FRONTEND_BUNDLE_PROCESSOR_CURSOR value to the `key_type` enum, because Postgres
        // refuses to *use* a new enum value in the transaction that added it — and each
        // migration fragment runs in its own transaction.
        sql!(
            connection,
            r#"
            INSERT INTO key_value_store (id, value_int)
            SELECT
                'FRONTEND_BUNDLE_PROCESSOR_CURSOR',
                COALESCE((SELECT MAX(cursor) FROM changelog), 0)
            WHERE NOT EXISTS (
                SELECT 1 FROM key_value_store WHERE id = 'FRONTEND_BUNDLE_PROCESSOR_CURSOR'
            );
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v3_00_00::V3_00_00, *},
        test_db::*,
    };
    use diesel::{sql_types::BigInt, QueryableByName, RunQueryDsl};

    #[derive(QueryableByName)]
    struct BigintValue {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }

    fn scalar(connection: &StorageConnection, query: &str) -> i64 {
        diesel::sql_query(query)
            .get_result::<BigintValue>(connection.lock().connection())
            .unwrap()
            .value
    }

    /// An established site upgrading must not leave the frontend_bundle processor at 0:
    /// it listens on `sync_file_reference` as well as `frontend_bundle`, so it would walk
    /// the site's entire file history on first start to reach rows that are all still in
    /// the future.
    #[actix_rt::test]
    async fn seeds_cursor_to_the_end_of_the_changelog() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_seed_frontend_bundle_processor_cursor",
            version: Some(V2_18_00.version()),
            ..Default::default()
        })
        .await;

        // Pre-existing history, of the kind this processor would otherwise chew through.
        // record_ids reference nothing, so later v3 fragments skip these rows.
        diesel::sql_query(
            "INSERT INTO changelog (table_name, record_id, row_action) VALUES
                ('sync_file_reference', 'file_a', 'UPSERT'),
                ('sync_file_reference', 'file_b', 'UPSERT'),
                ('sync_file_reference', 'file_c', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();

        migrate(
            &connection,
            Some(V3_00_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let max_cursor = scalar(
            &connection,
            "SELECT CAST(COALESCE(MAX(cursor), 0) AS BIGINT) AS value FROM changelog",
        );
        // Guards against the assertion below passing vacuously on an empty changelog.
        assert!(max_cursor > 0, "expected changelog history to exist");

        let seeded = scalar(
            &connection,
            "SELECT CAST(value_int AS BIGINT) AS value FROM key_value_store \
             WHERE id = 'FRONTEND_BUNDLE_PROCESSOR_CURSOR'",
        );
        assert_eq!(
            seeded, max_cursor,
            "processor should start at the end of the changelog, not walk it from 0"
        );
    }
}
