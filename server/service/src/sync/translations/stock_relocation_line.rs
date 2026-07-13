use repository::{
    ChangelogRow, ChangelogTableName, Row, StockRelocationLineRow, StockRelocationLineRowDelete,
    StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    item::ItemTranslation, location::LocationTranslation, stock_line::StockLineTranslation,
    stock_relocation::StockRelocationTranslation, FkField, PullTranslateResult,
    PushTranslateResult,
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
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_value::<StockRelocationLineRow>(sync_record.data.0.clone())?;

        let check_required_fks =
            fk_checker.with_table_required(connection, "stock_relocation_line", &row.id);
        let check_fks = fk_checker.with_table(connection, "stock_relocation_line", &row.id);

        // Required FKs (NOT NULL REFERENCES): error + system_log if the parent is missing.
        // The stock_relocation parent itself is covered by pull_dependencies / integration order.
        let stock_line_id = check_required_fks(row.stock_line_id, "stock_line_id", FkField::StockLine)?;
        // Optional FKs (nullable REFERENCES): cleared to None + system_log if the parent is missing.
        let destination_stock_line_id = check_fks(
            row.destination_stock_line_id,
            "destination_stock_line_id",
            FkField::StockLine,
        )?;
        let source_location_id =
            check_fks(row.source_location_id, "source_location_id", FkField::Location)?;
        let destination_location_id = check_fks(
            row.destination_location_id,
            "destination_location_id",
            FkField::Location,
        )?;

        let result = StockRelocationLineRow {
            stock_line_id,
            destination_stock_line_id,
            source_location_id,
            destination_location_id,
            ..row
        };

        Ok(PullTranslateResult::upsert(result))
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
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::StockRelocationLine(row) = row else {
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
    use repository::{
        mock::{mock_location_1, mock_stock_line_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
        StockRelocationLineRowRepository, StockRelocationRow, StockRelocationRowRepository,
        SyncRecordData,
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
        StockRelocationLineRowRepository::new(&connection)
            .upsert_one(&line)
            .unwrap();

        let changelog = ChangelogRow {
            cursor: 1,
            table_name: ChangelogTableName::StockRelocationLine,
            record_id: line.id.clone(),
            ..Default::default()
        };
        let push = translator
            .try_translate_to_upsert_sync_record(
                &connection,
                &changelog,
                Row::StockRelocationLine(line.clone()),
            )
            .unwrap();
        let record_data = match push {
            PushTranslateResult::PushRecord(records) => records[0].record.record_data.clone(),
            _ => panic!("expected a push record"),
        };

        let pull = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &SyncBufferRow {
                    record_id: line.id.clone(),
                    data: SyncRecordData(record_data),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(pull, PullTranslateResult::upsert(line));
    }
}
