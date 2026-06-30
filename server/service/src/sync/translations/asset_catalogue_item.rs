use repository::{
    asset_catalogue_item_row::AssetCatalogueItemRow, ChangelogRow, ChangelogTableName, Row,
    StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    asset_catalogue_type::AssetCatalogueTypeTranslation, asset_category::AssetCategoryTranslation,
    asset_class::AssetClassTranslation,
};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetCatalogueItemTranslation)
}

pub(crate) struct AssetCatalogueItemTranslation;

impl SyncTranslation for AssetCatalogueItemTranslation {
    fn table_name(&self) -> &str {
        "asset_catalogue_item"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            AssetCategoryTranslation.table_name(),
            AssetCatalogueTypeTranslation.table_name(),
            AssetClassTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AssetCatalogueItemRow {
            id,
            sub_catalogue,
            category_id,
            class_id,
            code,
            manufacturer,
            model,
            type_id,
            properties,
            deleted_datetime,
        } = serde_json::from_value::<AssetCatalogueItemRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "asset_catalogue_item", &id);

        let result = AssetCatalogueItemRow {
            id,
            sub_catalogue,
            category_id: check_fk(category_id, "asset_category_id", FkField::AssetCategory)?,
            class_id: check_fk(class_id, "asset_class_id", FkField::AssetClass)?,
            code,
            manufacturer,
            model,
            // asset_catalogue_type_id (type_id): SKIPPED, no repository for asset_catalogue_type
            type_id,
            properties,
            deleted_datetime,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AssetCatalogueItem)
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
        let Row::AssetCatalogueItem(asset_catalogue_item_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = asset_catalogue_item_row;

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
    use repository::{
        asset_category_row::{AssetCategoryRow, AssetCategoryRowRepository},
        asset_class_row::{AssetClassRow, AssetClassRowRepository},
        mock::MockDataInserts,
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn test_asset_catalogue_item_translation() {
        use crate::sync::test::test_data::asset_catalogue_item as test_data;
        let translator = AssetCatalogueItemTranslation;

        let (_, connection, _, _) = setup_all(
            "test_asset_catalogue_item_translation",
            MockDataInserts::all(),
        )
        .await;

        // Seed the asset_class + asset_category parents the item's required FKs point at.
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
