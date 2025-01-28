use std::convert::TryInto;

use crate::{ChangelogRepository, StorageConnection};

/// For testing, it returns the change_log cursors as if the changelog would have been updated.
pub(crate) fn run_without_change_log_updates<F: FnOnce() -> anyhow::Result<()>>(
    connection: &StorageConnection,
    job: F,
) -> anyhow::Result<u64> {
    // Remember the current changelog cursor in order to be able to delete all changelog entries
    // triggered by the merge migrations.
    let changelog_repo = ChangelogRepository::new(connection);
    let cursor_before_job = changelog_repo.latest_cursor()?;

    job()?;

    let cursor_after_job = changelog_repo.latest_cursor()?;
    // Revert changelog to the state before the merge migrations
    changelog_repo.delete((cursor_before_job + 1).try_into()?)?;
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

    let name_repo = NameRowRepository::new(&connection);
    let change_log_repo = ChangelogRepository::new(&connection);

    // First insert
    let cursor = change_log_repo.latest_cursor().unwrap();
    name_repo.upsert_one(&name_row).unwrap();
    assert!(cursor < change_log_repo.latest_cursor().unwrap());
    // Now update
    let cursor = change_log_repo.latest_cursor().unwrap();
    name_repo.upsert_one(&name_row).unwrap();
    assert!(cursor < change_log_repo.latest_cursor().unwrap());

    // Now update with run_without_change_log_updates
    let cursor = change_log_repo.latest_cursor().unwrap();
    run_without_change_log_updates(&connection, || Ok(name_repo.upsert_one(&name_row)?)).unwrap();
    assert_eq!(cursor, change_log_repo.latest_cursor().unwrap());
}
