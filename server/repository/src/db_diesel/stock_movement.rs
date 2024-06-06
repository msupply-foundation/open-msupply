use super::{stock_movement::stock_movement::dsl as stock_movement_dsl, StorageConnection};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    DatetimeFilter, EqualFilter, RepositoryError,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use util::Defaults;

table! {
    stock_movement (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
        datetime -> Timestamp,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct StockMovementRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub datetime: NaiveDateTime,
}

impl Default for StockMovementRow {
    fn default() -> Self {
        Self {
            datetime: Defaults::naive_date_time(),
            // Default
            id: Default::default(),
            item_id: Default::default(),
            store_id: Default::default(),
            quantity: Default::default(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct StockMovementFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
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
        let mut query = stock_movement_dsl::stock_movement.into_boxed();

        if let Some(f) = filter {
            let StockMovementFilter {
                item_id,
                datetime,
                store_id,
            } = f;

            apply_equal_filter!(query, item_id, stock_movement_dsl::item_id);
            apply_equal_filter!(query, store_id, stock_movement_dsl::store_id);
            apply_date_time_filter!(query, datetime, stock_movement_dsl::datetime);
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
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use util::{inline_edit, inline_init, uuid::uuid};

    use crate::{
        mock::{mock_item_a, mock_name_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceType, NameRow, StoreRow,
    };

    use super::*;

    #[actix_rt::test]
    async fn stock_movement_repository() {
        fn name() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "name".to_string();
            })
        }

        fn store() -> StoreRow {
            inline_init(|s: &mut StoreRow| {
                s.id = "store".to_string();
                s.name_link_id = name().id;
                s.code = "n/a".to_string();
            })
        }

        fn stock_movement_point() -> MockData {
            let invoice_id = uuid();
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_init(|r: &mut InvoiceRow| {
                    r.id = invoice_id.clone();
                    r.store_id = store().id;
                    r.name_link_id = mock_name_a().id;
                    r.r#type = InvoiceType::OutboundShipment;
                })];
                r.invoice_lines = vec![inline_init(|r: &mut InvoiceLineRow| {
                    r.id = format!("{}line", invoice_id);
                    r.invoice_id = invoice_id.clone();
                    r.item_link_id = mock_item_a().id;
                    r.r#type = InvoiceLineType::StockOut;
                    r.pack_size = 1.0;
                })];
            })
        }

        let (_, connection, _, _) = setup_all_with_data(
            "stock_movement_repository",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![name()];
                r.stores = vec![store()];
            })
            .join(inline_edit(&stock_movement_point(), |mut u| {
                u.invoices[0].picked_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 11, 2)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].number_of_packs = 20.0;
                u
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
                // Should not be counted
                u.invoices[0].picked_datetime = None;
                u.invoice_lines[0].pack_size = 10.0;
                u.invoice_lines[0].number_of_packs = 10.0;
                u
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
                u.invoices[0].picked_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 11, 3)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].pack_size = 10.0;
                u.invoice_lines[0].number_of_packs = 10.0;
                u
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
                u.invoices[0].r#type = InvoiceType::InboundShipment;
                u.invoices[0].delivered_datetime = Some(
                    NaiveDate::from_ymd_opt(2020, 12, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                );
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 15.0;
                u
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
                u.invoices[0].r#type = InvoiceType::InboundShipment;
                // Should not be counted
                u.invoices[0].delivered_datetime = None;
                u.invoice_lines[0].r#type = InvoiceLineType::StockIn;
                u.invoice_lines[0].number_of_packs = 20.0;
                u
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
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
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
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
            }))
            .join(inline_edit(&stock_movement_point(), |mut u| {
                u.invoices[0].r#type = InvoiceType::InventoryReduction;
                // Should not be counted
                u.invoices[0].verified_datetime = None;
                u.invoice_lines[0].r#type = InvoiceLineType::StockOut;
                u.invoice_lines[0].number_of_packs = 50.0;
                u
            })),
        )
        .await;

        let repo = StockMovementRepository::new(&connection);
        let mut rows = repo
            .query(Some(StockMovementFilter {
                store_id: Some(EqualFilter::equal_to(&store().id)),
                item_id: Some(EqualFilter::equal_to(&mock_item_a().id)),
                datetime: None,
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
                        .unwrap()
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: -(10.0 * 10.0),
                    datetime: NaiveDate::from_ymd_opt(2020, 11, 3)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: 15.0,
                    datetime: NaiveDate::from_ymd_opt(2020, 12, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: 60.0,
                    datetime: NaiveDate::from_ymd_opt(2021, 1, 20)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                },
                StockMovementRow {
                    id: "n/a".to_string(),
                    item_id: mock_item_a().id,
                    store_id: store().id,
                    quantity: -50.0,
                    datetime: NaiveDate::from_ymd_opt(2021, 2, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                },
            ]
        )
    }
}
