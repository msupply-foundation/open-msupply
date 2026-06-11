use repository::{
    asset_internal_location_row::AssetInternalLocationRow,
    asset_internal_location_row::AssetInternalLocationRowDelete, ChangelogRow, ChangelogTableName,
    Row, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{asset::AssetTranslation, location::LocationTranslation};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetInternalLocation)
}

pub(crate) struct AssetInternalLocation;

impl SyncTranslation for AssetInternalLocation {
    fn table_name(&self) -> &'static str {
        "asset_internal_location"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            LocationTranslation.table_name(),
            AssetTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AssetInternalLocationRow {
            id,
            asset_id,
            location_id,
        } = serde_json::from_value::<AssetInternalLocationRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "asset_internal_location", &id);

        let result = AssetInternalLocationRow {
            id,
            asset_id: check_fk(asset_id, "asset_id", FkField::Asset)?,
            location_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AssetInternalLocation)
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
        let Row::AssetInternalLocation(asset_internal_location_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = asset_internal_location_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(AssetInternalLocationRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_asset_asset_internal_location_translation() {
        use crate::sync::test::test_data::asset_internal_location as test_data;
        let translator = AssetInternalLocation;

        let (_, connection, _, _) = setup_all(
            "test_asset_asset_internal_location_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
