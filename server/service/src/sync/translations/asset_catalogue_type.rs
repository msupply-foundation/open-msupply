use repository::{
    asset_type_row::AssetTypeRow, ChangelogRow, ChangelogTableName, Row, StorageConnection,
    SyncBufferRow,
};

use crate::sync::translations::asset_category::AssetCategoryTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetCatalogueTypeTranslation)
}

pub(crate) struct AssetCatalogueTypeTranslation;

impl SyncTranslation for AssetCatalogueTypeTranslation {
    fn table_name(&self) -> &str {
        "asset_catalogue_type"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![AssetCategoryTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AssetTypeRow {
            id,
            name,
            category_id,
        } = serde_json::from_value::<AssetTypeRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "asset_catalogue_type", &id);

        let result = AssetTypeRow {
            id,
            name,
            category_id: check_fk(category_id, "asset_category_id", FkField::AssetCategory)?,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AssetCatalogueType)
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
        _changelog: &ChangelogRow,
        _row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        // AssetCatalogueType is not represented in the `Row` enum
        // (no bare-row variant for the asset_type repo at the moment),
        // so `query_with_data` cannot surface it. Unreachable for push
        // until the table is added to `Row`.
        Ok(PushTranslateResult::NotMatched)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        asset_category_row::{AssetCategoryRow, AssetCategoryRowRepository},
        asset_class_row::{AssetClassRow, AssetClassRowRepository},
        mock::MockDataInserts,
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn test_asset_type_translation() {
        use crate::sync::test::test_data::asset_type as test_data;
        let translator = AssetCatalogueTypeTranslation;

        let (_, connection, _, _) =
            setup_all("test_asset_type_translation", MockDataInserts::all()).await;

        // Seed the asset_category (and its asset_class parent) the type's required FK points at.
        AssetClassRowRepository::new(&connection)
            .upsert_one(&AssetClassRow {
                id: "32608ef9-dce5-41a7-b3e9-92b0fe086c7e".to_string(),
                name: "test".to_string(),
            })
            .unwrap();
        AssetCategoryRowRepository::new(&connection)
            .upsert_one(&AssetCategoryRow {
                id: "035d2847-1eec-4595-a161-b7cfefc17381".to_string(),
                name: "test".to_string(),
                class_id: "32608ef9-dce5-41a7-b3e9-92b0fe086c7e".to_string(),
            })
            .unwrap();

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
