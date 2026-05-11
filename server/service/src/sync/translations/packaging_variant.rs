use repository::item_variant::packaging_variant_row::PackagingVariantRow;
use repository::{ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncBufferRow};

use crate::sync::translations::item_variant::ItemVariantTranslation;

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PackagingVariantTranslation)
}

pub(super) struct PackagingVariantTranslation;

impl SyncTranslation for PackagingVariantTranslation {
    fn table_name(&self) -> &str {
        "packaging_variant"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![ItemVariantTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_value::<
            PackagingVariantRow,
        >(
            sync_record.data.0.clone()
        )?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::PackagingVariant)
    }

    // Only translating and pulling from central server
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
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
        let Row::PackagingVariant(packaging_variant_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = packaging_variant_row;

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
    async fn test_packaging_variant_translation() {
        use crate::sync::test::test_data::packaging_variant as test_data;
        let translator = PackagingVariantTranslation;

        let (_, connection, _, _) = setup_all(
            "test_packaging_variant_translation",
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
}
