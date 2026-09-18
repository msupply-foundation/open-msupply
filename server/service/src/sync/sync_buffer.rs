use chrono::NaiveDateTime;
use repository::{
    CursorDirection, IntegrationResult, PendingQuery, RepositoryError, StorageConnection,
    SyncAction, SyncBufferRepository, SyncBufferRow, SyncVersion,
};

pub(crate) fn write_sync_buffer_success(
    connection: &StorageConnection,
    cursor: i32,
    started_datetime: NaiveDateTime,
) -> Result<(), RepositoryError> {
    SyncBufferRepository::new(connection).set_integration_result(
        cursor,
        started_datetime,
        IntegrationResult::Success,
        None,
    )
}

pub(crate) fn write_sync_buffer_error(
    connection: &StorageConnection,
    cursor: i32,
    started_datetime: NaiveDateTime,
    error: &str,
) -> Result<(), RepositoryError> {
    SyncBufferRepository::new(connection).set_integration_result(
        cursor,
        started_datetime,
        IntegrationResult::Error,
        Some(error),
    )
}

pub(crate) fn write_sync_buffer_ignored(
    connection: &StorageConnection,
    cursor: i32,
    started_datetime: NaiveDateTime,
    message: &str,
) -> Result<(), RepositoryError> {
    SyncBufferRepository::new(connection).set_integration_result(
        cursor,
        started_datetime,
        IntegrationResult::Ignored,
        Some(message),
    )
}

pub(crate) fn get_sync_buffer_for_table(
    connection: &StorageConnection,
    action: SyncAction,
    table_name: &str,
    source_site_id: i32,
    limit: i64,
) -> Result<Vec<SyncBufferRow>, RepositoryError> {
    let direction = match action {
        SyncAction::Delete => CursorDirection::Desc,
        _ => CursorDirection::Asc,
    };

    let repo = SyncBufferRepository::new(connection);
    let rows = repo.pending_ordered_by_cursor(PendingQuery {
        source_site_id,
        sync_version: SyncVersion::V5V6,
        reference_id: None,
        table_name,
        action: action.clone(),
        direction,
        limit,
    })?;

    Ok(rows)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        IntegrationResult, SyncAction, SyncBufferRepository, SyncBufferRow,
    };

    use util::datetime_now;

    use super::*;

    fn row(record_id: &str, table_name: &str) -> SyncBufferRow {
        SyncBufferRow {
            record_id: record_id.to_string(),
            table_name: table_name.to_string(),
            received_datetime: Default::default(),
            source_site_id: 0,
            ..Default::default()
        }
    }

    fn ids(rows: &[SyncBufferRow]) -> Vec<&str> {
        rows.iter().map(|r| r.record_id.as_str()).collect()
    }

    #[actix_rt::test]
    async fn test_sync_buffer_service() {
        let row_1 = row("1", "transact");
        let row_2 = row("2", "trans_line");
        let row_3 = row("3", "store");
        let row_4 = row("4", "name");
        let row_5 = SyncBufferRow {
            action: SyncAction::Delete,
            ..row("5", "list_master")
        };
        let row_6 = SyncBufferRow {
            action: SyncAction::Delete,
            ..row("6", "list_master_line")
        };
        let site_1_row_1 = SyncBufferRow {
            action: SyncAction::Delete,
            source_site_id: 1,
            ..row("1-1", "list_master")
        };
        let site_1_row_2 = SyncBufferRow {
            action: SyncAction::Delete,
            source_site_id: 1,
            ..row("1-2", "list_master_line")
        };

        let (_, connection, _, _) = setup_all_with_data(
            "test_sync_buffer_service",
            MockDataInserts::none(),
            MockData {
                sync_buffer_rows: vec![
                    row_1.clone(),
                    row_2.clone(),
                    row_3.clone(),
                    row_4.clone(),
                    row_5.clone(),
                    row_6.clone(),
                    site_1_row_1.clone(),
                    site_1_row_2.clone(),
                ],
                ..Default::default()
            },
        )
        .await;

        // Upserts for OMS-Central (source_site_id 0): one pending row per table.
        let names =
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "name", 0, 100).unwrap();
        assert_eq!(ids(&names), vec!["4"]);
        let stores =
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "store", 0, 100).unwrap();
        assert_eq!(ids(&stores), vec!["3"]);
        let transacts =
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "transact", 0, 100).unwrap();
        assert_eq!(ids(&transacts), vec!["1"]);
        let trans_lines =
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "trans_line", 0, 100)
                .unwrap();
        assert_eq!(ids(&trans_lines), vec!["2"]);

        // Deletes for OMS-Central. Foreign source_site_id rows must not leak in.
        let list_master_deletes =
            get_sync_buffer_for_table(&connection, SyncAction::Delete, "list_master", 0, 100)
                .unwrap();
        assert_eq!(ids(&list_master_deletes), vec!["5"]);
        let list_master_line_deletes =
            get_sync_buffer_for_table(&connection, SyncAction::Delete, "list_master_line", 0, 100)
                .unwrap();
        assert_eq!(ids(&list_master_line_deletes), vec!["6"]);

        // Recording results moves rows out of the pending set.
        let started = datetime_now();
        write_sync_buffer_error(&connection, transacts[0].cursor, started, "Error 1").unwrap();
        write_sync_buffer_error(&connection, trans_lines[0].cursor, started, "Error 2").unwrap();

        assert!(
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "transact", 0, 100)
                .unwrap()
                .is_empty()
        );
        assert!(
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "trans_line", 0, 100)
                .unwrap()
                .is_empty()
        );

        let r1 = SyncBufferRepository::new(&connection)
            .find_latest_by_record_id_slow_unindexed("1")
            .unwrap()
            .unwrap();
        assert_eq!(r1.integration_result, Some(IntegrationResult::Error));
        assert_eq!(r1.integration_error.as_deref(), Some("Error 1"));

        write_sync_buffer_success(&connection, names[0].cursor, started).unwrap();
        write_sync_buffer_success(&connection, stores[0].cursor, started).unwrap();

        assert!(
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "name", 0, 100)
                .unwrap()
                .is_empty()
        );
        assert!(
            get_sync_buffer_for_table(&connection, SyncAction::Upsert, "store", 0, 100)
                .unwrap()
                .is_empty()
        );

        // Remote source_site_id 1: only the site_1 rows are returned, isolated from site 0.
        let remote_list_master =
            get_sync_buffer_for_table(&connection, SyncAction::Delete, "list_master", 1, 100)
                .unwrap();
        assert_eq!(ids(&remote_list_master), vec!["1-1"]);
        let remote_list_master_line =
            get_sync_buffer_for_table(&connection, SyncAction::Delete, "list_master_line", 1, 100)
                .unwrap();
        assert_eq!(ids(&remote_list_master_line), vec!["1-2"]);
    }
}
