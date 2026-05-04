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

/// Get pending V5/V6 sync_buffer rows ready for integration.
///
/// Caller walks `ordered_table_names` in FK dependency order for upserts and
/// reverse FK order for deletes. Within each `(table, action)` slice, rows are
/// returned in cursor order (Asc for upserts/merges, Desc for deletes).
pub(crate) fn get_ordered_sync_buffer_records(
    connection: &StorageConnection,
    action: SyncAction,
    ordered_table_names: &[&str],
    source_site_id: i32,
) -> Result<Vec<SyncBufferRow>, RepositoryError> {
    let direction = match action {
        SyncAction::Delete => CursorDirection::Desc,
        _ => CursorDirection::Asc,
    };

    let mut tables: Vec<&str> = ordered_table_names.iter().copied().collect();
    if let SyncAction::Delete = action {
        tables.reverse();
    }

    let repo = SyncBufferRepository::new(connection);
    let mut result = Vec::new();
    for table_name in tables {
        let mut rows = repo.pending_ordered_by_cursor(PendingQuery {
            source_site_id,
            sync_version: SyncVersion::V5V6,
            reference: None,
            table_name,
            action: action.clone(),
            direction,
        })?;
        result.append(&mut rows);
    }

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        IntegrationResult, SyncAction, SyncBufferRepository, SyncBufferRow,
    };

    use crate::sync::translations::{all_translators, pull_integration_order};
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

    #[actix_rt::test]
    async fn test_sync_buffer_service() {
        let translators = all_translators();
        let table_order = pull_integration_order(&translators);

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

        // UPSERTS for OMS-Central (source_site_id 0): tables in FK order, cursor ASC.
        let upserts =
            get_ordered_sync_buffer_records(&connection, SyncAction::Upsert, &table_order, 0)
                .unwrap();
        let ids: Vec<_> = upserts.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["4", "3", "1", "2"]);

        // DELETES for OMS-Central: tables in REVERSE FK order, cursor DESC.
        let deletes =
            get_ordered_sync_buffer_records(&connection, SyncAction::Delete, &table_order, 0)
                .unwrap();
        let ids: Vec<_> = deletes.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["6", "5"]);

        // Recording results moves rows out of the pending set.
        let started = datetime_now();
        write_sync_buffer_error(&connection, upserts[2].cursor, started, "Error 1").unwrap();
        write_sync_buffer_error(&connection, upserts[3].cursor, started, "Error 2").unwrap();

        let upserts =
            get_ordered_sync_buffer_records(&connection, SyncAction::Upsert, &table_order, 0)
                .unwrap();
        let ids: Vec<_> = upserts.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["4", "3"]);

        let r1 = SyncBufferRepository::new(&connection)
            .find_one_by_record_id("1")
            .unwrap()
            .unwrap();
        assert_eq!(r1.integration_result, Some(IntegrationResult::Error));
        assert_eq!(r1.integration_error.as_deref(), Some("Error 1"));

        write_sync_buffer_success(&connection, upserts[0].cursor, started).unwrap();
        write_sync_buffer_success(&connection, upserts[1].cursor, started).unwrap();

        let upserts =
            get_ordered_sync_buffer_records(&connection, SyncAction::Upsert, &table_order, 0)
                .unwrap();
        assert!(upserts.is_empty());

        // Remote source_site_id 1: only the site_1 rows are returned.
        let remote_deletes =
            get_ordered_sync_buffer_records(&connection, SyncAction::Delete, &table_order, 1)
                .unwrap();
        let ids: Vec<_> = remote_deletes
            .iter()
            .map(|r| r.record_id.as_str())
            .collect();
        assert_eq!(ids, vec!["1-2", "1-1"]);
    }
}
