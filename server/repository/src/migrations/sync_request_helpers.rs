// Helpers for migrations that need to enqueue a sync_request row asking for
// a pull or push of additional data. Kept in the migration layer (rather than
// the repository layer) so migrations don't take on a dependency on the
// `sync_request` row struct or its repository — those types may change shape
// in future versions in ways that would silently break old migrations. The
// only repository import is `ChangelogCondition::Inner` (the filter type),
// which is treated as a stable wire-format contract.

use diesel::{sql_query, OptionalExtension, RunQueryDsl};

use crate::{ChangelogCondition, RepositoryError, StorageConnection};

/// Direction for [`request_sync_request`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SyncRequestDirection {
    Pull,
    Push,
}

/// Migration helper. Inserts a row into `sync_request` asking for a pull (or
/// push) using `filter`. Inserts directly via SQL — bypasses the repository
/// layer, no changelog row is generated.
///
/// **No-op if the site has not yet started initial sync** (no `sync_log_v7`
/// row with `pull_started_datetime` set). Fresh installs don't need a queued
/// resync because the upcoming initial sync covers everything; SyncRequest
/// rows are also skipped during initialisation so an enqueued row would just
/// sit there.
pub fn request_sync_request(
    connection: &StorageConnection,
    description: &str,
    direction: SyncRequestDirection,
    filter: ChangelogCondition::Inner,
) -> Result<(), RepositoryError> {
    if !pull_has_started(connection)? {
        return Ok(());
    }

    let id = util::uuid::uuid();
    let filter_json =
        serde_json::to_string(&filter).map_err(|e| RepositoryError::DBError {
            msg: format!("failed to serialize sync_request filter: {e}"),
            extra: String::new(),
        })?;
    let now = chrono::Utc::now().naive_utc();

    let (pull_filter, push_filter) = match direction {
        SyncRequestDirection::Pull => (Some(filter_json), None),
        SyncRequestDirection::Push => (None, Some(filter_json)),
    };

    sql_query(
        "INSERT INTO sync_request \
         (id, reference_id, description, store_id, pull_filter, push_filter, \
          created_datetime, finished_datetime) \
         VALUES ($1, NULL, $2, NULL, $3, $4, $5, NULL)",
    )
    .bind::<diesel::sql_types::Text, _>(id)
    .bind::<diesel::sql_types::Text, _>(description.to_string())
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(pull_filter)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(push_filter)
    .bind::<diesel::sql_types::Timestamp, _>(now)
    .execute(connection.lock().connection())?;

    Ok(())
}

fn pull_has_started(connection: &StorageConnection) -> Result<bool, RepositoryError> {
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
