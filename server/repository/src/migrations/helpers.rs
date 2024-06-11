use std::convert::TryInto;

use crate::{ChangelogRepository, StorageConnection};

/// For testing, it returns the change_log cursors as if the changelog would have been updated.
pub(crate) fn run_without_change_log_updates<
    F: FnOnce(&StorageConnection) -> anyhow::Result<()>,
>(
    connection: &StorageConnection,
    job: F,
) -> anyhow::Result<u64> {
    // Remember the current changelog cursor in order to be able to delete all changelog entries
    // triggered by the merge migrations.
    let cursor_before_job = ChangelogRepository::new(connection).latest_cursor()?;

    job(connection)?;

    let cursor_after_job = ChangelogRepository::new(connection).latest_cursor()?;
    // Revert changelog to the state before the merge migrations
    ChangelogRepository::new(connection).delete((cursor_before_job + 1).try_into()?)?;
    Ok(cursor_after_job)
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
    let cursor = ChangelogRepository::new(&connection)
        .latest_cursor()
        .unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&name_row)
        .unwrap();
    assert!(
        cursor
            < ChangelogRepository::new(&connection)
                .latest_cursor()
                .unwrap()
    );
    // Now update
    let cursor = ChangelogRepository::new(&connection)
        .latest_cursor()
        .unwrap();
    NameRowRepository::new(&connection)
        .upsert_one(&name_row)
        .unwrap();
    assert!(
        cursor
            < ChangelogRepository::new(&connection)
                .latest_cursor()
                .unwrap()
    );

    // Now update with run_without_change_log_updates
    let cursor = ChangelogRepository::new(&connection)
        .latest_cursor()
        .unwrap();
    run_without_change_log_updates(&connection, |connection| {
        NameRowRepository::new(connection).upsert_one(&name_row)?;
        Ok(())
    })
    .unwrap();
    assert_eq!(
        cursor,
        ChangelogRepository::new(&connection)
            .latest_cursor()
            .unwrap()
    );
}
