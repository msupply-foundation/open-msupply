use chrono::NaiveDate;
use repository::{
    mock::{mock_outbound_shipment_a, mock_request_draft_requisition},
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        LocationRow,
    },
    EqualFilter, InvoiceLineRowRepository, InvoiceRepository, ItemFilter, ItemQueryRepository,
    LocationRowRepository, NameFilter, NameQueryRepository, RequisitionRowRepository,
    StockLineFilter, StockLineRepository, StorageConnection, StoreFilter, StoreRepository,
};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

#[derive(Debug)]
pub struct FullInvoice {
    row: InvoiceRow,
    lines: Vec<InvoiceLineRow>,
}
pub struct InvoiceRecordTester {}
impl SyncRecordTester<Vec<FullInvoice>> for InvoiceRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<FullInvoice> {
        // create test location
        let location = LocationRow {
            id: uuid(),
            name: "TestLocation".to_string(),
            code: "TestLocationCode".to_string(),
            on_hold: false,
            store_id: store_id.to_string(),
        };
        LocationRowRepository::new(connection)
            .upsert_one(&location)
            .unwrap();

        let other_store = StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new().id(EqualFilter::not_equal_to(store_id)))
            .unwrap()
            .pop()
            .unwrap();
        let item = ItemQueryRepository::new(connection)
            .query_one(ItemFilter::new())
            .unwrap()
            .unwrap();
        let invoice_id = uuid();
        let invoice_row = InvoiceRow {
            id: invoice_id.clone(),
            name_id: other_store.name_row.id,
            name_store_id: Some(other_store.store_row.id),
            store_id: store_id.to_string(),
            user_id: Some("user 1".to_string()),
            invoice_number: 8,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            created_datetime: NaiveDate::from_ymd(2022, 03, 24).and_hms(11, 35, 15),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
        };
        let invoice_line_row = InvoiceLineRow {
            id: uuid(),
            invoice_id,
            r#type: InvoiceLineRowType::StockIn,
            item_id: item.item_row.id,
            item_name: item.item_row.name,
            item_code: item.item_row.code,
            stock_line_id: None,
            location_id: Some(location.id),
            batch: None,
            expiry_date: None,
            pack_size: 1,
            cost_price_per_pack: 5.0,
            sell_price_per_pack: 10.0,
            total_before_tax: 8.0,
            total_after_tax: 12.0,
            tax: None,
            number_of_packs: 10,
            note: None,
        };
        let invoice_row_id_1 = uuid();
        let rows = vec![
            // try all row/line statuses and types
            FullInvoice {
                row: inline_edit(&invoice_row, |mut d| {
                    d.id = invoice_row_id_1.clone();
                    d.r#type = InvoiceRowType::OutboundShipment;
                    d.status = InvoiceRowStatus::Allocated;
                    d
                }),
                lines: vec![
                    inline_edit(&invoice_line_row, |mut d| {
                        d.id = uuid();
                        d.invoice_id = invoice_row_id_1.clone();
                        d.r#type = InvoiceLineRowType::UnallocatedStock;
                        d
                    }),
                    inline_edit(&invoice_line_row, |mut d| {
                        d.id = uuid();
                        d.invoice_id = invoice_row_id_1.clone();
                        d.r#type = InvoiceLineRowType::Service;
                        d
                    }),
                    inline_edit(&invoice_line_row, |mut d| {
                        d.id = uuid();
                        d.invoice_id = invoice_row_id_1.clone();
                        d.r#type = InvoiceLineRowType::StockIn;
                        d
                    }),
                    inline_edit(&invoice_line_row, |mut d| {
                        d.id = uuid();
                        d.invoice_id = invoice_row_id_1.clone();
                        d.r#type = InvoiceLineRowType::StockOut;
                        d
                    }),
                ],
            },
            FullInvoice {
                row: inline_edit(&invoice_row, |mut d| {
                    d.id = uuid();
                    d.r#type = InvoiceRowType::InventoryAdjustment;
                    d.status = InvoiceRowStatus::Picked;
                    d
                }),
                lines: vec![],
            },
            FullInvoice {
                row: inline_edit(&invoice_row, |mut d| {
                    d.id = uuid();
                    d.r#type = InvoiceRowType::OutboundShipment;
                    d.status = InvoiceRowStatus::Shipped;
                    d
                }),
                lines: vec![],
            },
            FullInvoice {
                row: inline_edit(&invoice_row, |mut d| {
                    d.id = uuid();
                    d.r#type = InvoiceRowType::OutboundShipment;
                    d.status = InvoiceRowStatus::Delivered;
                    d
                }),
                lines: vec![],
            },
            // main test data
            FullInvoice {
                row: invoice_row,
                lines: vec![invoice_line_row],
            },
        ];

        let repo = InvoiceRepository::new(connection);
        let line_repo = InvoiceLineRowRepository::new(connection);
        for row in &rows {
            repo.upsert_one(&row.row).unwrap();
            for line in &row.lines {
                line_repo.upsert_one(line).unwrap();
            }
        }
        rows
    }

    fn mutate(&self, connection: &StorageConnection, rows: &Vec<FullInvoice>) -> Vec<FullInvoice> {
        let repo = InvoiceRepository::new(connection);
        let line_repo = InvoiceLineRowRepository::new(connection);
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
                // create requisition and linked invoice
                let requisition = inline_edit(&mock_request_draft_requisition(), |mut r| {
                    r.name_id = name.name_row.id.clone();
                    r.store_id = row_existing.row.store_id.clone();
                    r
                });
                RequisitionRowRepository::new(connection)
                    .upsert_one(&requisition)
                    .unwrap();
                let linked_invoice = inline_edit(&mock_outbound_shipment_a(), |mut invoice| {
                    invoice.name_id = name.name_row.id.clone();
                    invoice.store_id = row_existing.row.store_id.clone();
                    invoice
                });
                repo.upsert_one(&linked_invoice).unwrap();

                let row = inline_edit(&row_existing.row, |mut d| {
                    d.user_id = Some("test user 2".to_string());
                    d.r#type = InvoiceRowType::InboundShipment;
                    d.status = InvoiceRowStatus::Verified;
                    d.on_hold = true;
                    d.comment = Some("invoice comment".to_string());
                    d.their_reference = Some("invoice their ref".to_string());
                    d.transport_reference = Some("transport reference".to_string());
                    d.allocated_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(11, 35, 15));
                    d.picked_datetime = Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(11, 35, 15));
                    d.shipped_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 26).and_hms(11, 35, 15));
                    d.delivered_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 27).and_hms(11, 35, 15));
                    d.verified_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 28).and_hms(11, 35, 15));
                    d.colour = Some("#1A1919".to_string());
                    d.requisition_id = Some(requisition.id);
                    d.linked_invoice_id = Some(linked_invoice.id);
                    d
                });
                let lines = row_existing
                    .lines
                    .iter()
                    .map(|l| {
                        let stock_line = StockLineRepository::new(connection)
                            .query_by_filter(StockLineFilter::new())
                            .unwrap()
                            .pop()
                            .unwrap()
                            .stock_line_row;

                        inline_edit(l, |mut d| {
                            d.r#type = InvoiceLineRowType::StockOut;
                            d.stock_line_id = Some(stock_line.id);
                            d.location_id = None;
                            d.batch = Some("invoice line batch".to_string());
                            d.expiry_date = Some(NaiveDate::from_ymd(2024, 04, 04));
                            d.pack_size = 10;
                            d.cost_price_per_pack = 15.0;
                            d.sell_price_per_pack = 15.0;
                            d.total_before_tax = 10.0;
                            d.total_after_tax = 15.0;
                            d.tax = Some(15.0);
                            d.number_of_packs = 15;
                            d.note = Some("invoice line note".to_string());
                            d
                        })
                    })
                    .collect();

                repo.upsert_one(&row).unwrap();
                for line in &lines {
                    line_repo.upsert_one(line).unwrap();
                }
                FullInvoice { row, lines }
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<FullInvoice>) {
        let repo = InvoiceRepository::new(connection);
        let line_repo = InvoiceLineRowRepository::new(connection);
        for row_expected in rows {
            let row = repo
                .find_one_by_id(&row_expected.row.id)
                .expect(&format!("Invoice row not found: {:?} ", row_expected.row));
            let line_rows = row_expected
                .lines
                .iter()
                .map(|line| {
                    line_repo.find_one_by_id(&line.id).expect(&format!(
                        "Invoice line row not found: {:?} ",
                        row_expected.row
                    ))
                })
                .collect::<Vec<InvoiceLineRow>>();
            for (i, expected_line) in row_expected.lines.iter().enumerate() {
                let line = &line_rows[i];
                assert_eq!(expected_line, line);
            }
            assert_eq!(row_expected.row, row);
        }
    }
}
