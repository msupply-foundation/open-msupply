use std::convert::TryFrom;

use repository::{NumberRow, NumberRowRepository, NumberRowType, StorageConnection};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::{gen_i64, SyncRecordTester};

pub struct NumberSyncRecordTester {}
impl SyncRecordTester<Vec<NumberRow>> for NumberSyncRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<NumberRow> {
        let number_repo = NumberRowRepository::new(&connection);

        let mut row_0 = number_repo
            .find_one_by_type_and_store(&NumberRowType::InboundShipment, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::InboundShipment.to_string(),
            });
        row_0.value = gen_i64();

        let mut row_1 = number_repo
            .find_one_by_type_and_store(&NumberRowType::OutboundShipment, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::OutboundShipment.to_string(),
            });
        row_1.value = gen_i64();

        let mut row_2 = number_repo
            .find_one_by_type_and_store(&NumberRowType::InventoryAdjustment, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::InventoryAdjustment.to_string(),
            });
        row_2.value = gen_i64();

        let mut row_3 = number_repo
            .find_one_by_type_and_store(&NumberRowType::RequestRequisition, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::RequestRequisition.to_string(),
            });
        row_3.value = gen_i64();

        let mut row_4 = number_repo
            .find_one_by_type_and_store(&NumberRowType::ResponseRequisition, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::ResponseRequisition.to_string(),
            });
        row_4.value = gen_i64();

        let mut row_5 = number_repo
            .find_one_by_type_and_store(&NumberRowType::Stocktake, &store_id)
            .unwrap()
            .unwrap_or(NumberRow {
                id: uuid(),
                value: 0,
                store_id: store_id.to_string(),
                r#type: NumberRowType::Stocktake.to_string(),
            });
        row_5.value = gen_i64();

        let rows = vec![row_0, row_1, row_2, row_3, row_4, row_5];
        for row in &rows {
            number_repo.upsert_one(row).unwrap();
        }
        rows
    }

    fn mutate(&self, connection: &StorageConnection, rows: &Vec<NumberRow>) -> Vec<NumberRow> {
        let number_repo = NumberRowRepository::new(&connection);
        let rows = rows
            .iter()
            .map(|row| {
                let row = inline_edit(row, |mut d| {
                    d.value = gen_i64();
                    d
                });
                number_repo.upsert_one(&row).unwrap();
                row
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<NumberRow>) {
        for row_expected in rows {
            let number_repo = NumberRowRepository::new(&connection);
            let row_type = match NumberRowType::try_from(row_expected.r#type.clone()) {
                Ok(row_type) => row_type,
                Err(_) => panic!("Invalid row type: {} -", row_expected.r#type),
            };

            let row = number_repo
                .find_one_by_type_and_store(&row_type, &row_expected.store_id)
                .unwrap()
                .expect(&format!("Number row not found: {:?} ", row_expected));
            assert_eq!(row_expected, &row);
        }
    }
}
