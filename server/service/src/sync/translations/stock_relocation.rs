use super::{SyncTranslation, ToSyncRecordTranslationType};
use crate::sync::translations::{
    store::StoreTranslation, FkField, PullTranslateResult, PushTranslateResult,
};
use repository::{
    ChangelogRow, ChangelogTableName, Row, StockRelocationRow, StockRelocationRowDelete,
    StorageConnection, SyncBufferRow,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StockRelocationTranslation)
}

pub(super) struct StockRelocationTranslation;

impl SyncTranslation for StockRelocationTranslation {
    fn table_name(&self) -> &'static str {
        "stock_relocation"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![StoreTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StockRelocation)
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

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_value::<StockRelocationRow>(sync_record.data.0.clone())?;

        let check_required_fks =
            fk_checker.with_table_required(connection, "stock_relocation", &row.id);

        let result = StockRelocationRow {
            store_id: check_required_fks(row.store_id, "store_id", FkField::Store)?,
            ..row
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(StockRelocationRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::StockRelocation(row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::StockRelocationStatus;

    #[test]
    fn stock_relocation_oms_wire_round_trip() {
        let row = StockRelocationRow {
            id: "stock_relocation_1".to_string(),
            store_id: "store_a".to_string(),
            stock_movement_number: 1,
            status: StockRelocationStatus::Confirmed,
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap(),
            created_by: "user_account_a".to_string(),
            confirmed_datetime: NaiveDate::from_ymd_opt(2024, 1, 2)
                .unwrap()
                .and_hms_opt(9, 0, 0),
            finalised_datetime: None,
            comment: Some("relocate to cold room".to_string()),
        };

        let json = serde_json::to_value(&row).unwrap();
        let parsed: StockRelocationRow = serde_json::from_value(json).unwrap();
        assert_eq!(parsed, row);
    }
}
