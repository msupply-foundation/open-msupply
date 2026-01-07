use super::StorageConnection;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    DatetimeFilter, EqualFilter, RepositoryError,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;

/*
-- Stock movement --

View over all stock movements in a store.

This is a separate repository/view from the item and stock ledgers,
as it does not include a running balance.

This makes it a less expensive repository to query, when the balance
is not needed or is calculated elsewhere.
 */

table! {
    stock_movement (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
        datetime -> Timestamp,
        stock_line_id -> Nullable<Text>, // TODO: Make this non-nullable, null is only used for non-stock lines so don't count as movements
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
pub struct StockMovementRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub datetime: NaiveDateTime,
    pub stock_line_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct StockMovementFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub stock_line_id: Option<EqualFilter<String>>,
}

pub struct StockMovementRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockMovementRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockMovementRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: StockMovementFilter,
    ) -> Result<Option<StockMovementRow>, RepositoryError> {
        Ok(self.query(Some(filter))?.pop())
    }

    pub fn query(
        &self,
        filter: Option<StockMovementFilter>,
    ) -> Result<Vec<StockMovementRow>, RepositoryError> {
        // Query StockMovement
        let mut query = stock_movement::table.into_boxed();

        if let Some(f) = filter {
            let StockMovementFilter {
                item_id,
                datetime,
                store_id,
                stock_line_id,
            } = f;

            apply_equal_filter!(query, item_id, stock_movement::item_id);
            apply_equal_filter!(query, store_id, stock_movement::store_id);
            apply_equal_filter!(query, stock_line_id, stock_movement::stock_line_id);
            apply_date_time_filter!(query, datetime, stock_movement::datetime);
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<StockMovementRow>(self.connection.lock().connection())?)
    }
}

impl StockMovementFilter {
    pub fn new() -> StockMovementFilter {
        StockMovementFilter::default()
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use util::uuid::uuid;

    use crate::{
        mock::{mock_item_a, mock_item_b, mock_name_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceType, ItemLinkRowRepository, NameRow,
        StoreRow,
    };

    use super::*;

    #[actix_rt::test]
    async fn stock_movement_repository() {
        fn name() -> NameRow {
            NameRow {
                id: "name".to_string(),
                ..Default::default()
            }
        }

        fn store() -> StoreRow {
            StoreRow {
                id: "store".to_string(),
                name_link_id: name().id,
                code: "n/a".to_string(),
                ..Default::default()
            }
        }

        fn stock_movement_point() -> MockData {
            let invoice_id = uuid();
            MockData {
                invoices: vec![InvoiceRow {
                    id: invoice_id.clone(),
                    store_id: store().id,
                    name_id: mock_name_a().id,
                    r#type: InvoiceType::OutboundShipment,
                    ..Default::default()
                }],
                invoice_lines: vec![InvoiceLineRow {
                    id: format!("{}line", invoice_id),
                    invoice_id: invoice_id.clone(),
                    item_link_id: mock_item_a().id,
                    r#type: InvoiceLineType::StockOut,
                    pack_size: 1.0,
                    ..Default::default()
                }],
                ..Default::default()
            }
        }

        let (_, connection, _, _) = setup_all_with_data(
            "stock_movement_repository",
            MockDataInserts::all(),
            MockData {
                names: vec![name()],
                stores: vec![store()],
                ..Default::default()
            }
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].picked_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 11, 2)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].number_of_packs = 20.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                // Should not be counted
                u.invoices[0].picked_datetime = None;
                u.invoice_lines[0].pack_size = 10.0;
                u.invoice_lines[0].number_of_packs = 10.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].picked_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 11, 3)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].pack_size = 10.0;
                u.invoice_lines[0].number_of_packs = 10.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InboundShipment;
                u.invoices[0].received_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 12, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 15.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InboundShipment;
                // Should not be counted
                u.invoices[0].received_datetime = None;
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 20.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InventoryAddition;
                u.invoices[0].verified_datetime = Some(
                    NaiveDate::from_ymd_opt(2021, 1, 20)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 60.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InventoryReduction;
                u.invoices[0].verified_datetime = Some(
                    NaiveDate::from_ymd_opt(2021, 2, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].r#type = InvoiceLineType::StockOut;
                u.invoice_lines[0].number_of_packs = 50.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InventoryReduction;
                // Should not be counted
                u.invoices[0].verified_datetime = None;
                u.invoice_lines[0].r#type = InvoiceLineType::StockOut;
                u.invoice_lines[0].number_of_packs = 50.0;
                u
            })
            .join({
                let mut u = stock_movement_point();
                u.invoices[0].r#type = InvoiceType::InventoryAddition;
                // Should not be counted
                u.invoices[0].verified_datetime = Some(
                    NaiveDate::from_ymd_opt(2021, 2, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].item_link_id = mock_item_b().id;
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 50.0;
                u
            }),
        )
        .await;

        let stock_movement_repo = StockMovementRepository::new(&connection);
        let mut rows = stock_movement_repo
            .query(Some(StockMovementFilter {
                store_id: Some(EqualFilter::equal_to(store().id)),
                item_id: Some(EqualFilter::equal_to(mock_item_a().id)),
                datetime: None,
                stock_line_id: None,
            }))
            .unwrap();

        rows.sort_by(|a, b| a.datetime.cmp(&b.datetime));
        rows = rows
            .into_iter()
            .map(|r| StockMovementRow {
                id: "n/a".to_string(),
                ..r
            })
            .collect();

        // TODO: unwrap this into various assertions that state what we are actually testing for
        assert_eq!(
            rows.iter().map(|r| r.quantity).sum::<f64>(),
            -95.0,
            "Total quantity should be sum"
        );
        assert_eq!(
            rows,
            vec![
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: -20.0,
                    datetime: NaiveDate::from_ymd_opt(2020, 11, 2)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    stock_line_id: None,
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: -(10.0 * 10.0),
                    datetime: NaiveDate::from_ymd_opt(2020, 11, 3)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    stock_line_id: None,
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: 15.0,
                    datetime: NaiveDate::from_ymd_opt(2020, 12, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    stock_line_id: None,
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: 60.0,
                    datetime: NaiveDate::from_ymd_opt(2021, 1, 20)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    stock_line_id: None,
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: -50.0,
                    datetime: NaiveDate::from_ymd_opt(2021, 2, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    stock_line_id: None,
                },
            ]
        );

        // Merge items
        let item_link_repo = ItemLinkRowRepository::new(&connection);
        let mut item_link_b = item_link_repo
            .find_one_by_id(&mock_item_b().id)
            .unwrap()
            .unwrap();
        item_link_b.item_id = mock_item_a().id;
        item_link_repo.upsert_one(&item_link_b).unwrap();

        let rows = stock_movement_repo
            .query(Some(StockMovementFilter {
                store_id: Some(EqualFilter::equal_to(store().id)),
                item_id: Some(EqualFilter::equal_to(mock_item_a().id)),
                datetime: None,
                stock_line_id: None,
            }))
            .unwrap();

        assert_eq!(
            rows.iter().map(|r| r.quantity).sum::<f64>(),
            -45.0,
            "Total quantity should include merge item stock"
        );
    }
}
