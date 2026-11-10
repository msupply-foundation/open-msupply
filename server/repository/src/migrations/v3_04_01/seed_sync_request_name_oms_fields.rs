use crate::{
    ChangelogTableName,
    migrations::{helpers::seed_sync_request_for_table, *},
};
use diesel::{OptionalExtension, QueryableByName, RunQueryDsl, sql_query};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_sync_request_name_oms_fields"
    }

    /// Re-pull name properties on sites that have done a v7 pull. Their initialisation
    /// applied name_oms_fields before name, so those updates found no row. Central,
    /// v5/v6 sites and fresh installs don't need it.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if !v7_pull_has_started(connection)? {
            return Ok(());
        }

        seed_sync_request_for_table(connection, ChangelogTableName::NameOmsFields)
    }
}

fn v7_pull_has_started(connection: &StorageConnection) -> anyhow::Result<bool> {
    #[derive(QueryableByName)]
    struct One {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        #[allow(dead_code)]
        v: i32,
    }

    let pulled: Option<One> =
        sql_query("SELECT 1 AS v FROM sync_log_v7 WHERE pull_started_datetime IS NOT NULL LIMIT 1")
            .get_result(connection.lock().connection())
            .optional()?;
    Ok(pulled.is_some())
}

#[cfg(test)]
mod test {
    use crate::{
        ChangelogCondition, ChangelogTableName, FilterBuilder,
        migrations::{v3_04_00::V3_04_00, v3_04_01::V3_04_01, *},
        test_db::*,
    };
    use diesel::{RunQueryDsl, prelude::*, sql_query};

    table! {
        sync_request (id) {
            id -> Text,
            reference_id -> Nullable<Text>,
            pull_filter -> Nullable<Text>,
            finished_datetime -> Nullable<Timestamp>,
        }
    }

    /// The pull the site has started before upgrading, if any.
    enum PullStarted {
        None,
        V5V6,
        V7,
    }

    async fn migrate_to_3_04_01(db_name: &str, pull_started: PullStarted) -> Vec<Option<String>> {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V3_04_00.version()),
            ..Default::default()
        })
        .await;

        let log = match pull_started {
            PullStarted::None => None,
            PullStarted::V5V6 => Some(
                "INSERT INTO sync_log (id, started_datetime, pull_central_started_datetime) \
                 VALUES ('log', '2026-10-01 00:00:00', '2026-10-01 00:00:01');",
            ),
            PullStarted::V7 => Some(
                "INSERT INTO sync_log_v7 (id, started_datetime, pull_started_datetime) \
                 VALUES ('log', '2026-10-01 00:00:00', '2026-10-01 00:00:01');",
            ),
        };
        if let Some(log) = log {
            sql_query(log)
                .execute(connection.lock().connection())
                .unwrap();
        }

        migrate(
            &connection,
            Some(V3_04_01.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        sync_request::table
            .filter(sync_request::reference_id.is_null())
            .filter(sync_request::finished_datetime.is_null())
            .select(sync_request::pull_filter)
            .load(connection.lock().connection())
            .unwrap()
    }

    /// A site that has pulled over v7 gets one request to pull name_oms_fields again.
    #[actix_rt::test]
    async fn seeds_request_after_v7_pull() {
        let pull_filters = migrate_to_3_04_01(
            "migration_seed_sync_request_name_oms_fields_v7",
            PullStarted::V7,
        )
        .await;

        let expected = serde_json::to_string(&ChangelogCondition::table_name::equal(
            ChangelogTableName::NameOmsFields,
        ))
        .unwrap();
        assert_eq!(pull_filters, vec![Some(expected)]);
    }

    /// Central, or a site still on v5/v6, has only v5/v6 pulls and gets no request.
    #[actix_rt::test]
    async fn skips_v5_v6_pull_only() {
        let pull_filters = migrate_to_3_04_01(
            "migration_seed_sync_request_name_oms_fields_v5_v6",
            PullStarted::V5V6,
        )
        .await;

        assert!(pull_filters.is_empty());
    }

    /// A fresh install gets no request.
    #[actix_rt::test]
    async fn skips_fresh_install() {
        let pull_filters = migrate_to_3_04_01(
            "migration_seed_sync_request_name_oms_fields_fresh",
            PullStarted::None,
        )
        .await;

        assert!(pull_filters.is_empty());
    }
}
