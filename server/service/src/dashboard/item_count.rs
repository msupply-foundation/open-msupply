use std::convert::TryInto;

use repository::{ItemFilter, ItemRepository, RepositoryError};

use crate::{item_stats::get_item_stats, service_provider::ServiceContext};

pub struct ItemCounts {
    pub total: i64,
    pub no_stock: i64,
    pub low_stock: i64,
}

pub trait ItemCountServiceTrait: Send + Sync {
    /// # Arguments
    ///
    /// * i32 threshold number of months below which is considered low stock
    fn get_item_counts(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<ItemCounts, RepositoryError> {
        ItemServiceCount {}.get_item_counts(ctx, store_id, low_stock_threshold)
    }
}

pub struct ItemServiceCount {}

impl ItemCountServiceTrait for ItemServiceCount {
    fn get_item_counts(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<ItemCounts, RepositoryError> {
        let repo = ItemRepository::new(&ctx.connection);
        let total = match repo.count(Some(ItemFilter::new().match_is_visible(true))) {
            Ok(total) => total,
            Err(error) => return Err(error),
        };

        let no_stock =
            match repo.count_no_stock(Some(ItemFilter::new().match_is_visible(true)), store_id) {
                Ok(no_stock) => no_stock,
                Err(error) => return Err(error),
            };

        let item_stats = get_item_stats(ctx, store_id, None, None)
            .unwrap()
            .into_iter()
            .filter(|item| {
                item.average_monthly_consumption != 0.0
                    && item.available_stock_on_hand as f64 / item.average_monthly_consumption
                        < low_stock_threshold as f64
            });

        let low_stock: i64 = match item_stats.count().try_into() {
            Ok(low_stock) => low_stock,
            Err(error) => {
                return Err(RepositoryError::DBError {
                    msg: error.to_string(),
                    extra: "".to_string(),
                })
            }
        };

        Ok(ItemCounts {
            total,
            no_stock,
            low_stock,
        })
    }
}

#[cfg(test)]
mod item_count_service_test {
    use chrono::{Duration, Utc};
    use repository::{
        mock::{mock_master_list_item_query_test1, mock_store_b, MockDataInserts},
        test_db, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow,
        InvoiceRowRepository, InvoiceRowType, ItemRow, ItemRowRepository, ItemRowType,
        MasterListLineRow, MasterListLineRowRepository, StockLineRow, StockLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        dashboard::item_count::{ItemCountServiceTrait, ItemServiceCount},
        service_provider::ServiceContext,
    };

    fn data(
        store_id: &str,
        master_list_id: &str,
    ) -> (Vec<ItemRow>, Vec<StockLineRow>, Vec<MasterListLineRow>) {
        let mut items = Vec::new();
        let mut stock_lines = Vec::new();
        let mut master_list_lines = Vec::new();
        for index in 0..50 {
            items.push(inline_init(|r: &mut ItemRow| {
                r.id = format!("item_id_{:05}", index);
                r.name = format!("name{}", index);
                r.code = format!("code{}", index);
                r.r#type = ItemRowType::Stock;
            }));
            stock_lines.push(inline_init(|r: &mut StockLineRow| {
                r.id = format!("stock_line_id_{:05}", index);
                r.item_id = format!("item_id_{:05}", index);
                r.store_id = store_id.to_string();
                r.available_number_of_packs = 5.0;
                r.pack_size = 1;
                // match index < 25 {
                //     true => index.into(),
                //     false => 0.0,
                // };
            }));
            master_list_lines.push(MasterListLineRow {
                id: format!("master_list_line_id_{:05}", index),
                item_id: format!("item_id_{:05}", index),
                master_list_id: master_list_id.to_string(),
            });
        }
        for index in 50..100 {
            items.push(inline_init(|r: &mut ItemRow| {
                r.id = format!("item_id_{:05}", index);
                r.name = format!("name{}", index);
                r.code = format!("code{}", index);
                r.r#type = ItemRowType::Stock;
            }));
        }

        (items, stock_lines, master_list_lines)
    }

    fn insert_data(service_context: &ServiceContext) {
        let master_list = mock_master_list_item_query_test1().master_list;
        let item_row_repository = ItemRowRepository::new(&service_context.connection);
        let master_list_line_repository =
            MasterListLineRowRepository::new(&service_context.connection);
        let stock_line_repository = StockLineRowRepository::new(&service_context.connection);

        let store_1 = mock_store_b();
        let (items, stock_lines, master_list_lines) = data(&store_1.id, &master_list.id);

        for row in items.iter() {
            item_row_repository.upsert_one(row).unwrap();
        }

        for master_list_line in master_list_lines.iter() {
            master_list_line_repository
                .upsert_one(&master_list_line)
                .unwrap();
        }

        for stock_line in stock_lines.iter() {
            stock_line_repository.upsert_one(&stock_line).unwrap();
        }
    }
    #[actix_rt::test]
    async fn test_total_items_count() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-total-items-count",
            MockDataInserts::none()
                .names()
                .stores()
                .name_store_joins()
                .units()
                .items()
                .full_master_list(),
        )
        .await;
        let service_context = ServiceContext::new_without_triggers(connection);
        insert_data(&service_context);

        let service = ItemServiceCount {};
        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        // count of total items which are visible to store b
        // with visibility determined by master list & master list name join
        assert_eq!(51, counts.total);
    }

    #[actix_rt::test]
    async fn test_no_stock_items_count() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-total-items-count",
            MockDataInserts::none()
                .names()
                .stores()
                .name_store_joins()
                .units()
                .items()
                .full_master_list(),
        )
        .await;
        let service_context = ServiceContext::new_without_triggers(connection);
        insert_data(&service_context);

        let service = ItemServiceCount {};
        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        // count of items with no stock
        // total items: 200+
        // items visible to store b: 51
        // items with no stock: 26
        // where no stock = available_number_of_packs == 0 or no stock line exists
        assert_eq!(26, counts.no_stock);

        // delete a stock line and check that the count is updated
        let stock_line_repository = StockLineRowRepository::new(&service_context.connection);
        stock_line_repository.delete("stock_line_id_00000").unwrap();

        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        // a stock line with available_number_of_packs > 0 has been removed
        assert_eq!(27, counts.no_stock);
    }

    #[actix_rt::test]
    async fn test_low_stock_items_count() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-total-items-count",
            MockDataInserts::none()
                .names()
                .stores()
                .name_store_joins()
                .units()
                .items()
                .full_master_list(),
        )
        .await;
        let service_context = ServiceContext::new_without_triggers(connection);
        insert_data(&service_context);

        let service = ItemServiceCount {};
        let counts = service
            .get_item_counts(&service_context, "store_b", 3)
            .unwrap();

        assert_eq!(0, counts.low_stock);

        // insert an invoice so that we have consumption history for an item
        let invoice_repository = InvoiceRowRepository::new(&service_context.connection);
        let invoice_line_repository = InvoiceLineRowRepository::new(&service_context.connection);
        invoice_repository
            .upsert_one(&inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice_00000".to_string();
                r.name_id = "name_store_a".to_string();
                r.name_store_id = Some("store_a".to_string());
                r.store_id = "store_b".to_string();
                r.picked_datetime = Some(Utc::now().naive_utc() - Duration::days(10));
                r.r#type = InvoiceRowType::OutboundShipment;
            }))
            .unwrap();

        invoice_line_repository
            .upsert_one(&inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line_row_id_00000".to_string();
                r.invoice_id = "invoice_00000".to_string();
                r.item_id = "item_id_00000".to_string();
                r.number_of_packs = 20.0;
                r.pack_size = 1;
                r.r#type = InvoiceLineRowType::StockOut;
            }))
            .unwrap();

        let counts = service
            .get_item_counts(&service_context, "store_b", 3)
            .unwrap();

        assert_eq!(1, counts.low_stock);
    }
}
