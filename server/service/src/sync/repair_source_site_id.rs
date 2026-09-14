use repository::{
    ChangelogRepository, RepositoryError, StorageConnection, SyncBufferRepository, SystemLogType,
};

use crate::activity_log::system_log;

/// Repair `source_site_id = 0`.
///
/// The backfills in `repository/src/migrations/v3_00_00/` stamp `source_site_id` with
/// `COALESCE(<central site id>, 0)`, but nothing wrote `SettingsSyncCentralServerSiteId` before
/// 2.9.0 - so on a database that never synced on 2.9+ the key is missing when those migrations
/// run and every backfilled row is stamped `0`. `0` is not a real site id, so it reads as
/// "authored on this site":
///
/// - The legacy push (`all_data_for_legacy_central`) selects those changelog rows, so the site
///   sends central reference data up to legacy central. On a remote that surfaces as an error
///   on `item`; on a central it is silent.
/// - Integration selects pending `sync_buffer` rows by `source_site_id`, so a row stamped `0` is
///   never picked up. That matters on central, where
///   `repository/src/migrations/v3_00_00/reintegrate_categories_for_custom_field_options.rs`
///   moves category rows back to pending so their `custom_field_option` backfill can run.
///
/// This can't be a migration: the central site id only reaches the database when sync fetches
/// site info, and the sync driver starts after migrations have run (see `server/src/lib.rs`).
/// So it runs early in a sync cycle instead, before the push and integration it corrects for.
///
/// Both updates walk their table in cursor windows rather than running as one statement, so a
/// central with a row per record across ~40 tables doesn't take a long lock on its first sync.
///
/// A central stays on v5/v6, so it runs this every sync cycle for the life of the site. The
/// changelog probe is the gate because it is indexed, where `sync_buffer` indexes
/// `source_site_id` for pending rows only. A clean changelog implies a clean buffer: the
/// changelog backfills stamped a row per record unconditionally, while `rebuild_sync_buffer`
/// kept any `source_site_id` a row already had. The buffer is restamped first, so a failure
/// between the two leaves the gate set.
pub(crate) fn repair_source_site_id(
    connection: &StorageConnection,
    central_site_id: i32,
) -> Result<(), RepositoryError> {
    // Nothing in open-mSupply issues site id 0, but if legacy central ever did, `0` would be a
    // legitimate stamp here and rewriting it would corrupt rather than repair.
    if central_site_id == 0 {
        return Ok(());
    }

    if !ChangelogRepository::new(connection).any_with_source_site_id(0)? {
        return Ok(());
    }

    let sync_buffer_rows =
        SyncBufferRepository::new(connection).update_source_site_id(0, central_site_id)?;
    let changelog_rows =
        ChangelogRepository::new(connection).update_source_site_id(0, central_site_id)?;

    if changelog_rows == 0 && sync_buffer_rows == 0 {
        return Ok(());
    }

    system_log(
        connection,
        SystemLogType::Migration,
        &format!(
            "Repaired source_site_id 0 -> {central_site_id}: \
             {changelog_rows} changelog rows, {sync_buffer_rows} sync_buffer rows"
        ),
    )
}

#[cfg(test)]
mod tests {
    use repository::{
        mock::MockDataInserts, system_log_row::SystemLogRowRepository, test_db::setup_all,
        ChangeLogInsertRow, ChangelogCondition, ChangelogRepository, ChangelogTableName,
        CursorAndLimit, RowActionType, StorageConnection, SyncAction, SyncBufferRepository,
        SyncBufferRowInsert, SyncRecordData,
    };
    use util::datetime_now;

    use super::repair_source_site_id;

    const CENTRAL_SITE_ID: i32 = 1;

    fn insert_changelog(connection: &StorageConnection, record_id: &str, source_site_id: i32) {
        ChangelogRepository::new(connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Item,
                record_id: record_id.to_string(),
                row_action: RowActionType::Upsert,
                source_site_id: Some(source_site_id),
                ..Default::default()
            })
            .unwrap();
    }

    fn insert_sync_buffer(connection: &StorageConnection, record_id: &str, source_site_id: i32) {
        SyncBufferRepository::new(connection)
            .insert_many(&[SyncBufferRowInsert {
                record_id: record_id.to_string(),
                received_datetime: datetime_now(),
                table_name: "item".to_string(),
                action: SyncAction::Upsert,
                data: SyncRecordData(serde_json::json!({})),
                source_site_id,
                ..Default::default()
            }])
            .unwrap();
    }

    fn changelog_source_site_id(connection: &StorageConnection, record_id: &str) -> Option<i32> {
        ChangelogRepository::new(connection)
            .query(
                ChangelogCondition::True(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 100,
                },
            )
            .unwrap()
            .rows
            .into_iter()
            .find(|row| row.record_id == record_id)
            .unwrap()
            .source_site_id
    }

    fn sync_buffer_source_site_id(connection: &StorageConnection, record_id: &str) -> i32 {
        SyncBufferRepository::new(connection)
            .find_latest_by_record_id_slow_unindexed(record_id)
            .unwrap()
            .unwrap()
            .source_site_id
    }

    /// What the repositories are tested on individually is that the right rows move; what this
    /// adds is that one call moves both tables and records having done so.
    #[actix_rt::test]
    async fn repair_restamps_both_tables_and_records_it() {
        let (_, connection, _, _) = setup_all(
            "repair_restamps_both_tables_and_records_it",
            MockDataInserts::none(),
        )
        .await;

        insert_changelog(&connection, "backfilled", 0);
        insert_sync_buffer(&connection, "backfilled", 0);

        repair_source_site_id(&connection, CENTRAL_SITE_ID).unwrap();

        assert_eq!(
            changelog_source_site_id(&connection, "backfilled"),
            Some(CENTRAL_SITE_ID)
        );
        assert_eq!(
            sync_buffer_source_site_id(&connection, "backfilled"),
            CENTRAL_SITE_ID
        );

        let repair_logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .into_iter()
            .filter(|log| {
                log.message
                    .as_deref()
                    .is_some_and(|message| message.contains("Repaired source_site_id"))
            })
            .count();
        assert_eq!(repair_logs, 1);
    }

    /// A clean changelog stops the pass, buffer row or not.
    #[actix_rt::test]
    async fn repair_skips_when_changelog_has_nothing_to_repair() {
        let (_, connection, _, _) = setup_all(
            "repair_skips_when_changelog_has_nothing_to_repair",
            MockDataInserts::none(),
        )
        .await;

        // Base seed data leaves changelog rows at 0, so clear the gate before testing that it
        // stops the second pass.
        repair_source_site_id(&connection, CENTRAL_SITE_ID).unwrap();

        insert_sync_buffer(&connection, "backfilled", 0);

        repair_source_site_id(&connection, CENTRAL_SITE_ID).unwrap();

        assert_eq!(sync_buffer_source_site_id(&connection, "backfilled"), 0);
    }

    /// If legacy central ever reported site id 0, `0` would be a legitimate stamp rather than
    /// the "unknown" marker, so the repair leaves the data alone.
    #[actix_rt::test]
    async fn repair_skips_when_central_site_id_is_zero() {
        let (_, connection, _, _) = setup_all(
            "repair_skips_when_central_site_id_is_zero",
            MockDataInserts::none(),
        )
        .await;

        insert_changelog(&connection, "backfilled", 0);

        repair_source_site_id(&connection, 0).unwrap();

        assert_eq!(changelog_source_site_id(&connection, "backfilled"), Some(0));
    }
}
