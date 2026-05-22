// Seeds three sync_request rows on existing remote installs so that
// user_account, user_permission and user_store_join get re-pulled by the
// sync_request_runner on the next tick. These three tables are marked
// `Central` (and thus already routed central→remote) but haven't always
// been actively backfilled — this migration explicitly requests them.
//
// Skipped on fresh installs (no sync_log_v7 row with `pull_started_datetime`
// yet): the upcoming initial sync covers everything and a queued request
// would just sit there until the auxiliary runner picks it up post-init.

use diesel::{sql_query, OptionalExtension, RunQueryDsl};

use crate::{
    dynamic_query_filter::FilterBuilder,
    migrations::*,
    ChangelogCondition, ChangelogTableName, Description, SyncRequestFilter,
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_sync_request_user_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if !pull_has_started(connection)? {
            return Ok(());
        }

        for table_name in [
            ChangelogTableName::UserAccount,
            ChangelogTableName::UserPermission,
            ChangelogTableName::UserStoreJoin,
        ] {
            insert_request(connection, table_name)?;
        }
        Ok(())
    }
}

fn insert_request(
    connection: &StorageConnection,
    table_name: ChangelogTableName,
) -> anyhow::Result<()> {
    let id = util::uuid::uuid();
    let description = Description::TableName {
        table_name: table_name.to_string(),
    };
    let description_json = serde_json::to_string(&description)?;
    let pull_filter = SyncRequestFilter(ChangelogCondition::table_name::equal(table_name));
    let pull_filter_json = serde_json::to_string(&pull_filter.0)?;
    let now = chrono::Utc::now().naive_utc();

    sql_query(
        "INSERT INTO sync_request \
         (id, reference_id, description, pull_filter, push_filter, \
          created_datetime, finished_datetime) \
         VALUES ($1, NULL, $2, $3, NULL, $4, NULL)",
    )
    .bind::<diesel::sql_types::Text, _>(id)
    .bind::<diesel::sql_types::Text, _>(description_json)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(Some(pull_filter_json))
    .bind::<diesel::sql_types::Timestamp, _>(now)
    .execute(connection.lock().connection())?;

    Ok(())
}

fn pull_has_started(connection: &StorageConnection) -> anyhow::Result<bool> {
    #[derive(diesel::QueryableByName)]
    struct One {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        #[allow(dead_code)]
        v: i32,
    }

    let row: Option<One> = sql_query(
        "SELECT 1 AS v FROM sync_log_v7 WHERE pull_started_datetime IS NOT NULL LIMIT 1",
    )
    .get_result(connection.lock().connection())
    .optional()?;
    Ok(row.is_some())
}
