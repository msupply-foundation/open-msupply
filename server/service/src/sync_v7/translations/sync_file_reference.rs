// V7 sync_file_reference translation: the generic row (de)serialization can't be used
// here because most of the row is local-only per-site state (direction, retries,
// transfer progress). Deserialize the shared `SyncFileReferenceWire` subset and merge
// it over the existing local row — mirroring the v5/v6 translator — so a pull never
// clobbers local bookkeeping (e.g. resetting `direction` on the origin site would stop
// an in-flight upload; resetting `status` would lose the synced Done/Error state).

use repository::{
    sync_file_reference_row::{SyncFileReferenceRowRepository, SyncFileReferenceWire},
    syncv7::SyncRecordSerializeError,
    ChangeLogInsertRow, StorageConnection, Upsert,
};

use crate::sync_v7::serde::DeserializeResult;

pub fn translate_sync_file_reference(
    connection: &StorageConnection,
    changelog_insert: ChangeLogInsertRow,
    data: &serde_json::Value,
) -> DeserializeResult {
    let wire: SyncFileReferenceWire = serde_json::from_value(data.clone())
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;

    let existing = SyncFileReferenceRowRepository::new(connection).find_one_by_id(&wire.id)?;
    let merged = wire.into_row(existing);

    Ok(vec![(Box::new(merged) as Box<dyn Upsert>, changelog_insert)])
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts,
        sync_file_reference_row::{SyncFileDirection, SyncFileReferenceRow, SyncFileStatus},
        test_db::setup_all,
        ChangelogSyncType, Row,
    };

    use crate::sync_v7::serde::serialize;

    fn base_row(id: &str) -> SyncFileReferenceRow {
        SyncFileReferenceRow {
            id: id.to_string(),
            table_name: "asset".to_string(),
            record_id: "rec1".to_string(),
            file_name: "asset1.jpg".to_string(),
            ..Default::default()
        }
    }

    // The v7 wire must match the v5/v6 wire: synced fields (status/error) cross,
    // local-only bookkeeping (direction, retries, transfer progress) never leaves the site.
    #[test]
    fn v7_push_uses_wire_shape() {
        let row = SyncFileReferenceRow {
            uploaded_bytes: 12345,
            retries: 3,
            direction: SyncFileDirection::Upload,
            status: SyncFileStatus::Error,
            error: Some("boom".to_string()),
            ..base_row("file1")
        };

        let value = serialize(&Row::SyncFileReference(row)).unwrap();

        assert_eq!(value.get("status"), Some(&serde_json::json!("Error")));
        assert_eq!(value.get("error"), Some(&serde_json::json!("boom")));
        for local_only in [
            "direction",
            "retries",
            "retry_at",
            "uploaded_bytes",
            "downloaded_bytes",
        ] {
            assert!(
                value.get(local_only).is_none(),
                "{} must not cross the v7 wire",
                local_only
            );
        }
    }

    #[actix_rt::test]
    async fn v7_pull_merges_over_local_row() {
        let (_, connection, _, _) =
            setup_all("v7_sync_file_reference_pull_merge", MockDataInserts::none()).await;

        let id = "12345678-1234-1234-1234-123456789012";
        let repo = SyncFileReferenceRowRepository::new(&connection);
        repo.upsert_without_changelog(&SyncFileReferenceRow {
            uploaded_bytes: 12345,
            retries: 2,
            direction: SyncFileDirection::Upload,
            status: SyncFileStatus::InProgress,
            ..base_row(id)
        })
        .unwrap();

        let incoming = serde_json::json!({
            "id": id,
            "table_name": "asset",
            "record_id": "rec1",
            "file_name": "asset1.jpg",
            "total_bytes": 99999,
            "status": "Done",
            "created_datetime": "2020-01-22T15:16:00",
        });

        let translated =
            translate_sync_file_reference(&connection, ChangeLogInsertRow::default(), &incoming)
                .unwrap();
        for (upsert, changelog_row) in translated {
            upsert
                .upsert_sync(&connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
                .unwrap();
        }

        let row = repo.find_one_by_id(id).unwrap().unwrap();
        // Synced fields took the incoming values.
        assert_eq!(row.total_bytes, 99999);
        assert_eq!(row.status, SyncFileStatus::Done);
        // Local-only fields kept their pre-existing values — in particular `direction`
        // stayed Upload, so an in-flight upload on the origin site isn't cancelled by a pull.
        assert_eq!(row.uploaded_bytes, 12345);
        assert_eq!(row.retries, 2);
        assert_eq!(row.direction, SyncFileDirection::Upload);
    }

    // A brand-new synced-in reference defaults direction to Download, so the upload
    // driver on non-origin sites never tries to upload bytes it doesn't hold.
    #[actix_rt::test]
    async fn v7_pull_of_new_row_defaults_direction_to_download() {
        let (_, connection, _, _) = setup_all(
            "v7_sync_file_reference_pull_new_row",
            MockDataInserts::none(),
        )
        .await;

        let id = "22345678-1234-1234-1234-123456789012";
        let incoming = serde_json::json!({
            "id": id,
            "table_name": "asset",
            "record_id": "rec1",
            "file_name": "asset1.jpg",
            "total_bytes": 42,
            "status": "Done",
            "created_datetime": "2020-01-22T15:16:00",
        });

        let translated =
            translate_sync_file_reference(&connection, ChangeLogInsertRow::default(), &incoming)
                .unwrap();
        for (upsert, changelog_row) in translated {
            upsert
                .upsert_sync(&connection, ChangelogSyncType::SyncTypeV7 { changelog_row })
                .unwrap();
        }

        let row = SyncFileReferenceRowRepository::new(&connection)
            .find_one_by_id(id)
            .unwrap()
            .unwrap();
        assert_eq!(row.direction, SyncFileDirection::Download);
        assert_eq!(row.status, SyncFileStatus::Done);
        assert_eq!(row.total_bytes, 42);
    }
}
