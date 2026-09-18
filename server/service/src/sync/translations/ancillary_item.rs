use repository::ancillary_item_row::AncillaryItemRow;
use repository::{ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncBufferRow};

use crate::sync::translations::item::ItemTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AncillaryItemTranslation)
}

pub(super) struct AncillaryItemTranslation;

impl SyncTranslation for AncillaryItemTranslation {
    fn table_name(&self) -> &str {
        "ancillary_item"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![ItemTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let AncillaryItemRow {
            id,
            item_quantity,
            ancillary_quantity,
            deleted_datetime,
            item_id,
            ancillary_item_id,
        } = serde_json::from_value::<AncillaryItemRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "ancillary_item", &id);

        let result = AncillaryItemRow {
            id,
            item_quantity,
            ancillary_quantity,
            deleted_datetime,
            item_id: check_fk(item_id, "item_link_id", FkField::ItemLink)?,
            ancillary_item_id: check_fk(
                ancillary_item_id,
                "ancillary_item_link_id",
                FkField::ItemLink,
            )?,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AncillaryItem)
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
        let Row::AncillaryItem(ancillary_item_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(ancillary_item_row)?,
        ))
    }
}
