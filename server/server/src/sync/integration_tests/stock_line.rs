use chrono::NaiveDate;
use repository::{
    EqualFilter, ItemFilter, ItemRepository, LocationRow, LocationRowRepository, StockLineRow,
    StockLineRowRepository, StorageConnection,
};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

pub struct StockLineRecordTester {}
impl SyncRecordTester<Vec<StockLineRow>> for StockLineRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<StockLineRow> {
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

        let item = ItemRepository::new(connection)
            .query_one(ItemFilter::new())
            .unwrap()
            .unwrap();
        let rows = vec![StockLineRow {
            id: uuid(),
            item_id: item.item_row.id,
            store_id: store_id.to_string(),
            location_id: Some(location.id),
            batch: Some("some remote sync test batch".to_string()),
            pack_size: 5,
            cost_price_per_pack: 10.0,
            sell_price_per_pack: 15.0,
            available_number_of_packs: 100,
            total_number_of_packs: 150,
            expiry_date: Some(NaiveDate::from_ymd(2021, 03, 21)),
            on_hold: true,
            note: Some("some remote sync test note".to_string()),
        }];
        let repo = StockLineRowRepository::new(connection);
        for row in &rows {
            repo.upsert_one(row).unwrap();
        }
        rows
    }

    fn mutate(
        &self,
        connection: &StorageConnection,
        rows: &Vec<StockLineRow>,
    ) -> Vec<StockLineRow> {
        let repo = StockLineRowRepository::new(&connection);
        let rows = rows
            .iter()
            .map(|row| {
                let new_item = ItemRepository::new(connection)
                    .query_one(ItemFilter::new().id(EqualFilter::not_equal_to(&row.item_id)))
                    .unwrap()
                    .unwrap();

                let row = inline_edit(row, |mut d| {
                    d.item_id = new_item.item_row.id;
                    d.location_id = None;
                    d.batch = Some("some remote sync test batch 2".to_string());
                    d.pack_size = 10;
                    d.cost_price_per_pack = 15.0;
                    d.sell_price_per_pack = 20.0;
                    d.available_number_of_packs = 110;
                    d.total_number_of_packs = 160;
                    d.expiry_date = Some(NaiveDate::from_ymd(2021, 03, 22));
                    d.on_hold = false;
                    d.note = Some("some remote sync test note 2".to_string());
                    d
                });
                repo.upsert_one(&row).unwrap();
                row
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<StockLineRow>) {
        for row_expected in rows {
            let repo = StockLineRowRepository::new(&connection);
            let row = repo
                .find_one_by_id(&row_expected.id)
                .expect(&format!("Stock line row not found: {:?} ", row_expected));
            assert_eq!(row_expected, &row);
        }
    }
}
