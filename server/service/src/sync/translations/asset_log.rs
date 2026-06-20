use repository::{
    asset_log_row::AssetLogRow, ChangelogRow, ChangelogTableName, Row, StorageConnection,
    SyncBufferRow,
};

use crate::sync::translations::{
    asset::AssetTranslation, asset_log_reason::AssetLogReasonTranslation,
};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetLogTranslation)
}

pub(crate) struct AssetLogTranslation;

impl SyncTranslation for AssetLogTranslation {
    fn table_name(&self) -> &'static str {
        "asset_log"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            AssetTranslation.table_name(),
            AssetLogReasonTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AssetLogRow {
            id,
            asset_id,
            user_id,
            status,
            comment,
            r#type,
            reason_id,
            log_datetime,
            created_datetime,
        } = serde_json::from_value::<AssetLogRow>(sync_record.data.0.clone())?;

        let fk_check = fk_checker.with_table(connection, "asset_log", &id);
        let check_fk = fk_checker.with_table_required(connection, "asset_log", &id);

        let result = AssetLogRow {
            id,
            asset_id: check_fk(asset_id, "asset_id", FkField::Asset)?,
            user_id,
            status,
            comment,
            r#type,
            reason_id: fk_check(reason_id, "reason_id", FkField::AssetLogReason)?,
            log_datetime,
            created_datetime,
        };

        Ok(PullTranslateResult::upsert(Row::AssetLog(result)))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AssetLog)
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
        let Row::AssetLog(asset_log_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = asset_log_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_asset_log_translation() {
        use crate::sync::test::test_data::asset_log as test_data;
        let translator = AssetLogTranslation;

        let (_, connection, _, _) =
            setup_all("test_asset_log_translation", MockDataInserts::none()).await;

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
