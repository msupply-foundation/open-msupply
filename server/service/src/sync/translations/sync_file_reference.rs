use repository::{
<<<<<<< HEAD
    sync_file_reference_row::{SyncFileReferenceRowRepository, SyncFileReferenceWire},
=======
    sync_file_reference_row::SyncFileReferenceRow,
>>>>>>> origin/v3.0.0-RC
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
    Row,

};

use crate::sync::translations::asset::AssetTranslation;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(SyncFileReferenceTranslation)
}

pub(crate) struct SyncFileReferenceTranslation;

impl SyncTranslation for SyncFileReferenceTranslation {
    fn table_name(&self) -> &'static str {
        "sync_file_reference"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![AssetTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
<<<<<<< HEAD
        let wire: SyncFileReferenceWire = serde_json::from_str(&sync_record.data)?;
        let existing =
            SyncFileReferenceRowRepository::new(connection).find_one_by_id(&wire.id)?;

        Ok(PullTranslateResult::upsert(wire.into_row(existing)))
=======
        Ok(PullTranslateResult::upsert(serde_json::from_value::<
            SyncFileReferenceRow,
        >(sync_record.data.0.clone())?))
>>>>>>> origin/v3.0.0-RC
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::SyncFileReference)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::SyncFileReference(sync_file_reference_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

<<<<<<< HEAD
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(SyncFileReferenceWire::from_row(&row))?,
        ))
=======
        let row = sync_file_reference_row;

        Ok(PushTranslateResult::upsert(changelog, self.table_name(), serde_json::to_value(row)?))
>>>>>>> origin/v3.0.0-RC
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use repository::{
        mock::MockDataInserts,
        sync_file_reference_row::{
            SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository,
            SyncFileStatus,
        },
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn test_sync_file_reference_translation() {
        use crate::sync::test::test_data::sync_file_reference as test_data;
        let translator = SyncFileReferenceTranslation;

        let (_, connection, _, _) = setup_all(
            "test_sync_file_reference_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    // Verifies the local/synced split: incoming wire data updates the synced fields
    // but leaves our locally-tracked retry counters and progress bytes untouched.
    #[actix_rt::test]
    async fn test_sync_file_reference_preserves_local_fields_on_pull() {
        let (_, connection, _, _) = setup_all(
            "test_sync_file_reference_preserves_local_fields_on_pull",
            MockDataInserts::none(),
        )
        .await;

        let id = "12345678-1234-1234-1234-123456789012";
        let repo = SyncFileReferenceRowRepository::new(&connection);
        repo.upsert_one(&SyncFileReferenceRow {
            id: id.to_string(),
            table_name: "asset".to_string(),
            record_id: "rec1".to_string(),
            file_name: "asset1.jpg".to_string(),
            uploaded_bytes: 12345,
            retries: 2,
            direction: SyncFileDirection::Upload,
            status: SyncFileStatus::InProgress,
            ..Default::default()
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

        let wire: SyncFileReferenceWire = serde_json::from_str(&incoming.to_string()).unwrap();
        let existing = repo.find_one_by_id(id).unwrap();
        let merged = wire.into_row(existing);
        repo.upsert_one(&merged).unwrap();

        let row = repo.find_one_by_id(id).unwrap().unwrap();

        // Synced fields took the incoming values.
        assert_eq!(row.total_bytes, 99999);
        assert_eq!(row.status, SyncFileStatus::Done);
        // Local fields kept their pre-existing values.
        assert_eq!(row.uploaded_bytes, 12345);
        assert_eq!(row.retries, 2);
        assert_eq!(row.direction, SyncFileDirection::Upload);
    }
}
