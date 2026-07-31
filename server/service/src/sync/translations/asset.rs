use repository::{
    asset_row::{AssetRow, AssetRowDelete},
    ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    asset_catalogue_item::AssetCatalogueItemTranslation,
    asset_catalogue_type::AssetCatalogueTypeTranslation, asset_category::AssetCategoryTranslation,
    asset_class::AssetClassTranslation, store::StoreTranslation,
};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetTranslation)
}

pub(crate) struct AssetTranslation;

impl SyncTranslation for AssetTranslation {
    fn table_name(&self) -> &'static str {
        "asset"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            StoreTranslation.table_name(),
            AssetCatalogueItemTranslation.table_name(),
            AssetCategoryTranslation.table_name(),
            AssetClassTranslation.table_name(),
            AssetCatalogueTypeTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AssetRow {
            id,
            notes,
            asset_number,
            asset_category_id,
            asset_class_id,
            asset_type_id,
            store_id,
            serial_number,
            catalogue_item_id,
            installation_date,
            replacement_date,
            created_datetime,
            modified_datetime,
            deleted_datetime,
            properties,
            donor_name_id,
            warranty_start,
            warranty_end,
            needs_replacement,
            locked_fields_json,
        } = sync_record.deserialize::<AssetRow>()?;

        let fk_check = fk_checker.with_table(connection, "asset", &id);

        let result = AssetRow {
            id,
            notes,
            asset_number,
            asset_category_id: fk_check(
                asset_category_id,
                "asset_category_id",
                FkField::AssetCategory,
            )?,
            asset_class_id: fk_check(asset_class_id, "asset_class_id", FkField::AssetClass)?,
            asset_type_id: fk_check(
                asset_type_id,
                "asset_catalogue_type_id",
                FkField::AssetCatalogueType,
            )?,
            store_id: fk_check(store_id, "store_id", FkField::Store)?,
            serial_number,
            catalogue_item_id: fk_check(
                catalogue_item_id,
                "asset_catalogue_item_id",
                FkField::AssetCatalogueItem,
            )?,
            installation_date,
            replacement_date,
            created_datetime,
            modified_datetime,
            deleted_datetime,
            properties,
            donor_name_id: fk_check(donor_name_id, "donor_name_id", FkField::NameLink)?,
            warranty_start,
            warranty_end,
            needs_replacement,
            locked_fields_json,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Asset)
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
        let Row::Asset(asset_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = asset_row;

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
        Ok(PullTranslateResult::delete(AssetRowDelete(
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
    async fn test_asset_translation() {
        use crate::sync::test::test_data::asset as test_data;
        let translator = AssetTranslation;

        let (_, connection, _, _) =
            setup_all("test_asset_translation", MockDataInserts::all()).await;

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
