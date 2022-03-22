use chrono::NaiveDate;
use repository::{
    schema::{StocktakeLineRow, StocktakeRow, StocktakeStatus},
    InvoiceFilter, InvoiceQueryRepository, ItemFilter, ItemQueryRepository, ItemRepository,
    StockLineFilter, StockLineRepository, StocktakeLineRowRepository, StocktakeRowRepository,
    StorageConnection,
};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

#[derive(Debug)]
pub struct FullStocktake {
    stocktake: StocktakeRow,
    lines: Vec<StocktakeLineRow>,
}
pub struct StocktakeRecordTester {}
impl SyncRecordTester<Vec<FullStocktake>> for StocktakeRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<FullStocktake> {
        let item = ItemQueryRepository::new(connection)
            .query_one(ItemFilter::new())
            .unwrap()
            .unwrap();

        let stocktake_id_1 = uuid();
        let rows = vec![FullStocktake {
            stocktake: StocktakeRow {
                id: stocktake_id_1.clone(),
                store_id: store_id.to_string(),
                user_id: "test user".to_string(),
                stocktake_number: 55,
                comment: None,
                description: None,
                status: StocktakeStatus::New,
                created_datetime: NaiveDate::from_ymd(2022, 03, 22).and_hms(9, 51, 0),
                stocktake_date: None,
                finalised_datetime: None,
                inventory_adjustment_id: None,
                is_locked: true,
            },
            lines: vec![StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id_1,
                stock_line_id: None,
                location_id: None,
                comment: None,
                snapshot_number_of_packs: 100,
                counted_number_of_packs: None,
                item_id: item.item_row.id,
                batch: None,
                expiry_date: None,
                pack_size: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
                note: None,
            }],
        }];
        let stocktake_repo = StocktakeRowRepository::new(connection);
        let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
        for row in &rows {
            stocktake_repo.upsert_one(&row.stocktake).unwrap();
            for line in &row.lines {
                stocktake_line_repo.upsert_one(line).unwrap();
            }
        }
        rows
    }

    fn mutate(
        &self,
        connection: &StorageConnection,
        rows: &Vec<FullStocktake>,
    ) -> Vec<FullStocktake> {
        let invoice = InvoiceQueryRepository::new(connection)
            .query_one(InvoiceFilter::new())
            .unwrap()
            .unwrap();
        let stocktake_repo = StocktakeRowRepository::new(connection);
        let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
        let rows = rows
            .iter()
            .map(|row| {
                let stocktake = inline_edit(&row.stocktake, |mut d| {
                    d.user_id = "test user 2".to_string();
                    d.comment = Some("comment sync test".to_string());
                    d.description = Some("description sync test".to_string());
                    d.status = StocktakeStatus::Finalised;
                    d.stocktake_date = Some(NaiveDate::from_ymd(2022, 03, 23));
                    d.finalised_datetime =
                        Some(NaiveDate::from_ymd(2022, 03, 24).and_hms(8, 15, 30));
                    d.inventory_adjustment_id = Some(invoice.invoice_row.id.clone());
                    d.is_locked = true;
                    d
                });
                let lines = row
                    .lines
                    .iter()
                    .map(|l| {
                        let stock_line = StockLineRepository::new(connection)
                            .query_by_filter(StockLineFilter::new())
                            .unwrap()
                            .pop()
                            .unwrap()
                            .stock_line_row;
                        let item = ItemRepository::new(connection)
                            .find_one_by_id(&stock_line.item_id)
                            .unwrap()
                            .unwrap();
                        inline_edit(l, |mut d| {
                            d.comment = Some("stocktake line comment".to_string());
                            d.snapshot_number_of_packs = 110;
                            d.counted_number_of_packs = Some(90);
                            d.item_id = item.id;
                            d.stock_line_id = Some(stock_line.id);
                            d.batch = stock_line.batch;
                            d.expiry_date = stock_line.expiry_date;
                            d.pack_size = Some(stock_line.pack_size);
                            d.cost_price_per_pack = Some(stock_line.cost_price_per_pack);
                            d.sell_price_per_pack = Some(stock_line.sell_price_per_pack);
                            d.note = stock_line.note;
                            d
                        })
                    })
                    .collect();

                stocktake_repo.upsert_one(&stocktake).unwrap();
                for line in &lines {
                    stocktake_line_repo.upsert_one(line).unwrap();
                }
                FullStocktake { stocktake, lines }
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<FullStocktake>) {
        let stocktake_repo = StocktakeRowRepository::new(connection);
        let stocktake_line_repo = StocktakeLineRowRepository::new(connection);
        for row_expected in rows {
            let stock_take_row = stocktake_repo
                .find_one_by_id(&row_expected.stocktake.id)
                .expect(&format!("Stocktake row not found: {:?} ", row_expected))
                .unwrap();
            let line_rows = row_expected
                .lines
                .iter()
                .map(|line| {
                    stocktake_line_repo
                        .find_one_by_id(&line.id)
                        .expect(&format!(
                            "Stocktake line row not found: {:?} ",
                            row_expected
                        ))
                        .unwrap()
                })
                .collect::<Vec<StocktakeLineRow>>();
            for (i, expected_line) in row_expected.lines.iter().enumerate() {
                let line = &line_rows[i];
                assert_eq!(expected_line, line);
            }
            assert_eq!(row_expected.stocktake, stock_take_row);
        }
    }
}
