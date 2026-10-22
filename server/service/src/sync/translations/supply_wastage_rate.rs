use repository::{
    ChangelogRow, ChangelogTableName, Row, StorageConnection, SupplyWastageRateRow, SyncBufferRow,
};

use crate::sync::translations::item::ItemTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(SupplyWastageRateTranslation)
}

pub(super) struct SupplyWastageRateTranslation;

impl SyncTranslation for SupplyWastageRateTranslation {
    fn table_name(&self) -> &str {
        "supply_wastage_rate"
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
        let SupplyWastageRateRow {
            id,
            wastage_rate,
            item_id,
        } = serde_json::from_value::<SupplyWastageRateRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "supply_wastage_rate", &id);

        let result = SupplyWastageRateRow {
            id,
            wastage_rate,
            item_id: check_fk(item_id, "item_link_id", FkField::ItemLink)?,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::SupplyWastageRate)
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
        let Row::SupplyWastageRate(supply_wastage_rate_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(supply_wastage_rate_row)?,
        ))
    }
}
