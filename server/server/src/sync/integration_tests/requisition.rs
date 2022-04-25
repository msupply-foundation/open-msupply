use chrono::NaiveDate;
use repository::{
    mock::mock_request_draft_requisition,
    schema::{RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    EqualFilter, ItemFilter, ItemRepository, NameFilter, NameQueryRepository,
    RequisitionLineRowRepository, RequisitionRowRepository, StorageConnection,
};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

#[derive(Debug)]
pub struct FullRequisition {
    row: RequisitionRow,
    lines: Vec<RequisitionLineRow>,
}
pub struct RequisitionRecordTester {}
impl SyncRecordTester<Vec<FullRequisition>> for RequisitionRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<FullRequisition> {
        let name = NameQueryRepository::new(connection)
            .query_by_filter(store_id, NameFilter::new().is_store(true))
            .unwrap()
            .pop()
            .unwrap();
        let item = ItemRepository::new(connection)
            .query_one(ItemFilter::new())
            .unwrap()
            .unwrap();

        let row = RequisitionRow {
            id: uuid(),
            store_id: store_id.to_string(),
            user_id: None,
            requisition_number: 456,
            name_id: name.name_row.id,
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: NaiveDate::from_ymd(2022, 03, 23).and_hms(8, 53, 0),
            sent_datetime: None,
            finalised_datetime: None,
            expected_delivery_date: None,
            colour: None,
            comment: None,
            their_reference: None,
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            linked_requisition_id: None,
        };
        let rows = vec![
            FullRequisition {
                row: inline_edit(&row, |mut d| {
                    d.id = uuid();
                    d.r#type = RequisitionRowType::Response;
                    d.status = RequisitionRowStatus::New;
                    d
                }),
                lines: vec![],
            },
            FullRequisition {
                row: inline_edit(&row, |mut d| {
                    d.id = uuid();
                    d.status = RequisitionRowStatus::Sent;
                    d
                }),
                lines: vec![],
            },
            FullRequisition {
                row: inline_edit(&row, |mut d| {
                    d.id = uuid();
                    d.status = RequisitionRowStatus::Finalised;
                    d
                }),
                lines: vec![],
            },
            FullRequisition {
                lines: vec![RequisitionLineRow {
                    id: uuid(),
                    requisition_id: row.id.clone(),
                    item_id: item.item_row.id,
                    requested_quantity: 50,
                    suggested_quantity: 10,
                    supply_quantity: 5,
                    available_stock_on_hand: 10,
                    average_monthly_consumption: 15,
                    comment: None,
                    snapshot_datetime: None,
                }],
                row,
            },
        ];
        let repo = RequisitionRowRepository::new(connection);
        let line_repo = RequisitionLineRowRepository::new(connection);
        for row in &rows {
            repo.upsert_one(&row.row).unwrap();
            for line in &row.lines {
                line_repo.upsert_one(line).unwrap();
            }
        }
        rows
    }

    fn mutate(
        &self,
        connection: &StorageConnection,
        rows: &Vec<FullRequisition>,
    ) -> Vec<FullRequisition> {
        let repo = RequisitionRowRepository::new(connection);
        let line_repo = RequisitionLineRowRepository::new(connection);
        let rows = rows
            .iter()
            .map(|row_existing| {
                let name = NameQueryRepository::new(connection)
                    .query_by_filter(
                        &row_existing.row.store_id,
                        NameFilter::new().id(EqualFilter::equal_to(&row_existing.row.name_id)),
                    )
                    .unwrap()
                    .pop()
                    .unwrap();
                // create linked requisition
                let mut requisition = mock_request_draft_requisition();
                requisition.name_id = name.name_row.id.clone();
                requisition.store_id = row_existing.row.store_id.clone();
                RequisitionRowRepository::new(connection)
                    .upsert_one(&requisition)
                    .unwrap();

                let row = inline_edit(&row_existing.row, |mut d| {
                    d.user_id = Some("test user 2".to_string());
                    d.r#type = RequisitionRowType::Response;
                    d.status = RequisitionRowStatus::Finalised;
                    d.comment = Some("requisition comment".to_string());
                    d.their_reference = Some("requisition their ref".to_string());
                    d.colour = Some("#1A1919".to_string());
                    d.sent_datetime = Some(NaiveDate::from_ymd(2022, 03, 24).and_hms(8, 53, 0));
                    d.finalised_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(8, 53, 0));
                    d.expected_delivery_date = Some(NaiveDate::from_ymd(2022, 03, 28));
                    d.max_months_of_stock = 15.0;
                    d.min_months_of_stock = 10.0;
                    d.linked_requisition_id = Some(requisition.id);
                    d
                });
                let lines = row_existing
                    .lines
                    .iter()
                    .map(|l| {
                        inline_edit(l, |mut d| {
                            d.requested_quantity = 55;
                            d.suggested_quantity = 15;
                            d.supply_quantity = 15;
                            d.available_stock_on_hand = 15;
                            d.average_monthly_consumption = 20;
                            d.comment = Some("some comment".to_string());
                            d.snapshot_datetime =
                                Some(NaiveDate::from_ymd(2022, 03, 20).and_hms(12, 13, 14));
                            d
                        })
                    })
                    .collect();

                repo.upsert_one(&row).unwrap();
                for line in &lines {
                    line_repo.upsert_one(line).unwrap();
                }
                FullRequisition { row, lines }
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<FullRequisition>) {
        let repo = RequisitionRowRepository::new(connection);
        let line_repo = RequisitionLineRowRepository::new(connection);
        for row_expected in rows {
            let row = repo
                .find_one_by_id(&row_expected.row.id)
                .unwrap()
                .expect(&format!(
                    "Requisition row not found: {:?} ",
                    row_expected.row
                ));
            let line_rows = row_expected
                .lines
                .iter()
                .map(|line| {
                    line_repo.find_one_by_id(&line.id).unwrap().expect(&format!(
                        "Requisition line row not found: {:?} ",
                        row_expected.row
                    ))
                })
                .collect::<Vec<RequisitionLineRow>>();
            for (i, expected_line) in row_expected.lines.iter().enumerate() {
                let line = &line_rows[i];
                assert_eq!(expected_line, line);
            }
            assert_eq!(row_expected.row, row);
        }
    }
}
