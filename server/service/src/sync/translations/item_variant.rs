use repository::item_variant::item_variant_row::ItemVariantRow;
use repository::{ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncBufferRow};

use crate::sync::translations::item::ItemTranslation;
use crate::sync::translations::location_type::LocationTypeTranslation;
use crate::sync::translations::name::NameTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemVariantTranslation)
}

pub(super) struct ItemVariantTranslation;

impl SyncTranslation for ItemVariantTranslation {
    fn table_name(&self) -> &str {
        "item_variant"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            ItemTranslation.table_name(),
            NameTranslation.table_name(),
            LocationTypeTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let ItemVariantRow {
            id,
            name,
            item_link_id,
            location_type_id,
            deleted_datetime,
            vvm_type,
            created_datetime,
            created_by,
            manufacturer_id,
        } = serde_json::from_value::<ItemVariantRow>(sync_record.data.0.clone())?;

        let fk_check = fk_checker.with_table(connection, "item_variant", &id);
        let check_fk = fk_checker.with_table_required(connection, "item_variant", &id);

        let result = ItemVariantRow {
            id,
            name,
            item_link_id: check_fk(item_link_id, "item_link_id", FkField::ItemLink)?,
            location_type_id: fk_check(location_type_id, "location_type_id", FkField::LocationType)?,
            deleted_datetime,
            vvm_type,
            created_datetime,
            created_by,
            // manufacturer is a name id resolved to name_link on upsert; name_link.id == name.id by
            // convention, so validating the name id against name_link is correct.
            manufacturer_id: fk_check(manufacturer_id, "manufacturer_link_id", FkField::NameLink)?,
        };

        Ok(PullTranslateResult::upsert(Row::ItemVariant(result)))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::ItemVariant)
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
        let Row::ItemVariant(item_variant_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = item_variant_row;

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
    async fn test_item_variant_translation() {
        use crate::sync::test::test_data::item_variant as test_data;
        let translator = ItemVariantTranslation;

        let (_, connection, _, _) =
            setup_all("test_item_variant_translation", MockDataInserts::none()).await;

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
