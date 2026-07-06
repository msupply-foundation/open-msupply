use diesel::{prelude::*, sql_types::BigInt};

use crate::{
    db_diesel::changelog::changelog::changelog_with_links, ChangelogCondition, ChangelogRepository,
    ChangelogTableName, Description, FilterBuilder, RepositoryError, StorageConnection,
    SyncRequestFilter,
};

/// Highest allocated changelog cursor, read from the sequence so it includes
/// values handed out by uncommitted `nextval` calls. Postgres-only.
pub(crate) fn max_sequence(connection: &StorageConnection) -> Result<i64, RepositoryError> {
    #[derive(QueryableByName)]
    struct Bigint {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }
    let row: Bigint = diesel::sql_query(
        "SELECT COALESCE(pg_sequence_last_value('changelog_cursor_seq'), 0) AS value",
    )
    .get_result(connection.lock().connection())?;
    Ok(row.value)
}

/// For testing, it returns the change_log cursors as if the changelog would have been updated.
pub(crate) fn run_without_change_log_updates<
    F: FnOnce(&StorageConnection) -> anyhow::Result<()>,
>(
    connection: &StorageConnection,
    job: F,
) -> anyhow::Result<u64> {
    // Remember the current changelog cursor in order to be able to delete all changelog entries
    // triggered by the merge migrations.
    let cursor_before_job = ChangelogRepository::new(connection).max_cursor()?;

    job(connection)?;

    let cursor_after_job = ChangelogRepository::new(connection).max_cursor()?;
    // Revert changelog to the state before the merge migrations. Delete via the
    // underlying table — `changelog::table` (the view) is read-only.
    diesel::delete(changelog_with_links::table)
        .filter(changelog_with_links::cursor.gt(cursor_before_job as i64))
        .execute(connection.lock().connection())?;
    Ok(cursor_after_job)
}

/// True if this site has ever started a pull (v7 or v5/v6) — i.e. it's an
/// existing install, not a fresh one. Used to guard `sync_request`-seeding
/// migrations: on a fresh install the upcoming initial sync covers everything,
/// so a queued request would just sit unrun.
pub(crate) fn pull_has_started(connection: &StorageConnection) -> anyhow::Result<bool> {
    use diesel::sql_query;

    #[derive(QueryableByName)]
    struct One {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        #[allow(dead_code)]
        v: i32,
    }

    let v7: Option<One> =
        sql_query("SELECT 1 AS v FROM sync_log_v7 WHERE pull_started_datetime IS NOT NULL LIMIT 1")
            .get_result(connection.lock().connection())
            .optional()?;
    if v7.is_some() {
        return Ok(true);
    }

    let v5v6: Option<One> = sql_query(
        "SELECT 1 AS v FROM sync_log WHERE pull_central_started_datetime IS NOT NULL LIMIT 1",
    )
    .get_result(connection.lock().connection())
    .optional()?;
    Ok(v5v6.is_some())
}

/// Seed a `sync_request` that re-pulls every row of `table_name` (from cursor 0)
/// on the next sync tick. Used by migrations to backfill records that existing
/// v7 sites would otherwise miss — their v7 pull cursor was seeded from the v6
/// position, so a normal pull never re-pulls rows that predate the migration.
///
/// `reference_id` is left NULL so the `sync_request_runner` groups it fresh and
/// assigns one on first run. No-op semantics are the caller's responsibility:
/// guard with [`pull_has_started`] to skip fresh installs.
pub(crate) fn seed_sync_request_for_table(
    connection: &StorageConnection,
    table_name: ChangelogTableName,
) -> anyhow::Result<()> {
    use diesel::sql_query;

    let description = Description::TableName {
        table_name: table_name.to_string(),
    };
    let pull_filter = SyncRequestFilter(ChangelogCondition::table_name::equal(table_name));
    let now = chrono::Utc::now().naive_utc();

    sql_query(
        "INSERT INTO sync_request \
         (id, reference_id, description, pull_filter, push_filter, \
          created_datetime, finished_datetime) \
         VALUES ($1, NULL, $2, $3, NULL, $4, NULL)",
    )
    .bind::<diesel::sql_types::Text, _>(util::uuid::uuid())
    .bind::<diesel::sql_types::Text, _>(serde_json::to_string(&description)?)
    .bind::<diesel::sql_types::Nullable<diesel::sql_types::Text>, _>(Some(serde_json::to_string(
        &pull_filter.0,
    )?))
    .bind::<diesel::sql_types::Timestamp, _>(now)
    .execute(connection.lock().connection())?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn check_change_log_update() {
    use crate::{test_db::*, NameRow, NameRowRepository};

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: "check_change_log_update",
        ..Default::default()
    })
    .await;

    let name_row = NameRow {
        id: "name1".to_string(),
        ..Default::default()
    };

    // First insert
    let cursor = ChangelogRepository::new(&connection).max_cursor().unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&name_row)
        .unwrap();
    assert!(cursor < ChangelogRepository::new(&connection).max_cursor().unwrap());
    // Now update
    let cursor = ChangelogRepository::new(&connection).max_cursor().unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&name_row)
        .unwrap();
    assert!(cursor < ChangelogRepository::new(&connection).max_cursor().unwrap());

    // Now update with run_without_change_log_updates
    let cursor = ChangelogRepository::new(&connection).max_cursor().unwrap();
    run_without_change_log_updates(&connection, |connection| {
        NameRowRepository::new(connection).upsert_one(&name_row)?;
        Ok(())
    })
    .unwrap();
    assert_eq!(
        cursor,
        ChangelogRepository::new(&connection).max_cursor().unwrap()
    );
}
