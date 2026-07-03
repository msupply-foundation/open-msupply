use repository::{
    ChangelogRow, ChangelogTableName, StockRelocationLineRow, StockRelocationLineRowDelete,
    StockRelocationLineRowRepository, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    item::ItemTranslation, location::LocationTranslation, stock_line::StockLineTranslation,
    stock_relocation::StockRelocationTranslation, PullTranslateResult, PushTranslateResult,
};

use super::{SyncTranslation, ToSyncRecordTranslationType};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StockRelocationLineTranslation)
}

pub(super) struct StockRelocationLineTranslation;

impl SyncTranslation for StockRelocationLineTranslation {
    fn table_name(&self) -> &'static str {
        "stock_relocation_line"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            StockRelocationTranslation.table_name(),
            StockLineTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StockRelocationLine)
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
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_str::<StockRelocationLineRow>(&sync_record.data)?;
        Ok(PullTranslateResult::upsert(row))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(StockRelocationLineRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = StockRelocationLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Stock relocation line row ({}) not found",
                    changelog.record_id
                )
            })?;

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
    use repository::{
        mock::{mock_location_1, mock_stock_line_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
        StockRelocationRow, StockRelocationRowRepository, Upsert,
    };

    #[actix_rt::test]
    async fn stock_relocation_line_oms_round_trip() {
        let translator = StockRelocationLineTranslation;
        let (_, connection, _, _) = setup_all(
            "test_stock_relocation_line_translation",
            MockDataInserts::all(),
        )
        .await;

        StockRelocationRowRepository::new(&connection)
            .upsert_one(&StockRelocationRow {
                id: "stock_relocation_1".to_string(),
                store_id: mock_store_a().id,
                stock_movement_number: 1,
                created_by: "user_account_a".to_string(),
                ..Default::default()
            })
            .unwrap();

        let line = StockRelocationLineRow {
            id: "stock_relocation_line_1".to_string(),
            stock_relocation_id: "stock_relocation_1".to_string(),
            stock_line_id: mock_stock_line_a().id,
            source_location_id: Some(mock_location_1().id),
            number_of_packs: 5.0,
            ..Default::default()
        };
        line.upsert(&connection).unwrap();

        let changelog = ChangelogRow {
            cursor: 1,
            table_name: ChangelogTableName::StockRelocationLine,
            record_id: line.id.clone(),
            ..Default::default()
        };
        let push = translator
            .try_translate_to_upsert_sync_record(&connection, &changelog)
            .unwrap();
        let record_data = match push {
            PushTranslateResult::PushRecord(records) => records[0].record.record_data.clone(),
            _ => panic!("expected a push record"),
        };

        let pull = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &SyncBufferRow {
                    record_id: line.id.clone(),
                    data: record_data.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(pull, PullTranslateResult::upsert(line));
    }
}
