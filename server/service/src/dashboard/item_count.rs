use crate::{
    item::get_items_with_consumption,
    item_stats::{get_item_stats, ItemStats},
    preference::{
        NumberOfMonthsThresholdToShowOverStockAlertsForProducts,
        NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts, Preference,
    },
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};

use repository::{EqualFilter, ItemFilter, ItemRepository, RepositoryError};

pub struct ItemCounts {
    pub total: i64,
    pub no_stock: i64,
    pub low_stock: i64,
    pub more_than_six_months_stock: i64,
    pub out_of_stock_products: i64,
    pub products_at_risk_of_being_out_of_stock: i64,
    pub products_overstocked: i64,
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
    ) -> Result<ItemCounts, PluginOrRepositoryError> {
        ItemServiceCount {}.get_item_counts(ctx, store_id, low_stock_threshold)
    }

    fn get_no_stock_count(&self, item_stats: &Vec<ItemStats>) -> i64 {
        item_stats
            .iter()
            .filter(|i| i.total_stock_on_hand == 0.0)
            .count() as i64
    }

    fn get_low_stock_count(&self, item_stats: &Vec<ItemStats>, low_stock_threshold: i32) -> i64 {
        item_stats
            .iter()
            .filter(|&i| (i.average_monthly_consumption > 0.0)) // exclude items with 0 amc from count, because we assume that means there's no consumption data so we cannot tell how many months of stock there might be.
            .map(|i| i.total_stock_on_hand / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock < low_stock_threshold as f64)
            .count() as i64
    }

    fn get_more_than_six_months_stock_count(&self, item_stats: &Vec<ItemStats>) -> i64 {
        item_stats
            .iter()
            .filter(|&i| (i.average_monthly_consumption > 0.0)) // exclude items with 0 amc from count, because we assume that means there's no consumption data so we cannot tell how many months of stock there might be.
            .map(|i| i.total_stock_on_hand / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock > 6.0)
            .count() as i64
    }

    fn get_out_of_stock_products_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        item_ids: Vec<String>,
    ) -> Result<i64, PluginOrRepositoryError> {
        let items_with_consumption_set = get_items_with_consumption(
            &ctx.connection,
            ItemFilter::new()
                .id(EqualFilter::equal_any(item_ids))
                .has_stock_on_hand(false),
            store_id,
        )?;

        Ok(items_with_consumption_set.len() as i64)
    }

    fn get_products_at_risk_of_being_out_of_stock_count(
        &self,
        item_stats: &Vec<ItemStats>,
        threshold_months: i32,
    ) -> i64 {
        item_stats
            .iter()
            .filter(|i| {
                i.average_monthly_consumption > 0.0
                    && i.total_stock_on_hand > 0.0
                    && (i.total_stock_on_hand / i.average_monthly_consumption)
                        < threshold_months as f64
            })
            .count() as i64
    }

    fn get_products_overstocked_count(
        &self,
        item_stats: &Vec<ItemStats>,
        threshold_months: i32,
    ) -> i64 {
        item_stats
            .iter()
            .filter(|i| {
                i.average_monthly_consumption > 0.0
                    && (i.total_stock_on_hand / i.average_monthly_consumption)
                        > threshold_months as f64
            })
            .count() as i64
    }
}

pub struct ItemServiceCount {}

impl ItemCountServiceTrait for ItemServiceCount {
    fn get_item_counts(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        low_stock_threshold: i32,
    ) -> Result<ItemCounts, PluginOrRepositoryError> {
        let visible_or_on_hand_items = ItemRepository::new(&ctx.connection).query_by_filter(
            ItemFilter::new().visible_or_on_hand(true).is_active(true),
            Some(store_id.to_string()),
        )?;

        let total_count = visible_or_on_hand_items.len() as i64;

        let item_ids: Vec<String> = visible_or_on_hand_items
            .into_iter()
            .map(|i| i.item_row.id)
            .collect();

        let item_stats = get_item_stats(&ctx.connection, store_id, None, item_ids.clone(), None)?;

        let no_stock = Self::get_no_stock_count(self, &item_stats);

        let low_stock = Self::get_low_stock_count(self, &item_stats, low_stock_threshold);

        let more_than_six_months_stock =
            Self::get_more_than_six_months_stock_count(self, &item_stats);

        let num_months_consumption =
            NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts
                .load(&ctx.connection, Some(store_id.to_string()))
                .map_err(|e| {
                    PluginOrRepositoryError::RepositoryError(RepositoryError::DBError {
                        msg: format!("Failed to load preference: {e}"),
                        extra: Default::default(),
                    })
                })?;

        let show_over_stock_alerts = NumberOfMonthsThresholdToShowOverStockAlertsForProducts
            .load(&ctx.connection, Some(store_id.to_string()))
            .map_err(|e| {
                PluginOrRepositoryError::RepositoryError(RepositoryError::DBError {
                    msg: format!("Failed to load preference: {e}"),
                    extra: Default::default(),
                })
            })?;

        let item_stats_with_time_window = get_item_stats(
            &ctx.connection,
            store_id,
            Some(num_months_consumption as f64),
            item_ids,
            None,
        )?;

        let out_of_stock_products =
            self.get_out_of_stock_products_count(ctx, store_id, item_ids.clone())?;

        let show_low_stock_alerts = NumberOfMonthsThresholdToShowLowStockAlertsForProducts
            .load(&ctx.connection, Some(store_id.to_string()))
            .map_err(|e| {
                PluginOrRepositoryError::RepositoryError(RepositoryError::DBError {
                    msg: format!("Failed to load preference: {e}"),
                    extra: Default::default(),
                })
            })?;

        let products_at_risk_of_being_out_of_stock = self
            .get_products_at_risk_of_being_out_of_stock_count(&item_stats, show_low_stock_alerts);

        let products_overstocked = Self::get_products_overstocked_count(
            self,
            &item_stats_with_time_window,
            show_over_stock_alerts,
        );

        Ok(ItemCounts {
            total: total_count,
            no_stock,
            low_stock,
            more_than_six_months_stock,
            out_of_stock_products,
            products_at_risk_of_being_out_of_stock,
            products_overstocked,
        })
    }
}

#[cfg(test)]
mod item_count_service_test {

    use repository::{
        mock::{common::FullMockMasterList, mock_store_b, MockData, MockDataInserts},
        ItemRow, ItemType, MasterListLineRow, MasterListNameJoinRow, MasterListRow, StockLineRow,
    };

    use crate::{
        dashboard::item_count::{ItemCountServiceTrait, ItemServiceCount},
        item_stats::ItemStats,
        test_helpers::{
            setup_all_and_service_provider, setup_all_with_data_and_service_provider,
            ServiceTestContext,
        },
    };

    #[actix_rt::test]
    async fn test_total_count() {
        // We'll make a mock database with 4 items...
        // - item 1 = in a master list, therefore visible to the store => included in the count
        // - item 2 = not in a master list, but with some stock on hand => included in the count
        // - item 3 = not in a master list and with a stockline saying stock on hand = 0 => excluded from the count
        // - item 4 = not in a master list and without a stockline => excluded from the count
        // so expected result = 2.

        let ServiceTestContext {
            service_context, ..
        } = setup_all_with_data_and_service_provider(
            "omsupply-database-total-items-count",
            MockDataInserts::none().stores().names(),
            MockData {
                items: vec![
                    ItemRow {
                        id: "item1".to_string(),
                        r#type: ItemType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item2".to_string(),
                        r#type: ItemType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item3".to_string(),
                        r#type: ItemType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item4".to_string(),
                        r#type: ItemType::Stock,
                        ..ItemRow::default()
                    },
                ],
                full_master_lists: vec![FullMockMasterList {
                    master_list: MasterListRow {
                        id: "list1".to_string(),
                        name: String::new(),
                        code: String::new(),
                        description: String::new(),
                        is_active: true,
                        ..Default::default()
                    },
                    joins: vec![MasterListNameJoinRow {
                        id: "join1".to_string(),
                        master_list_id: "list1".to_string(),
                        name_link_id: mock_store_b().name_link_id,
                    }],
                    lines: vec![MasterListLineRow {
                        id: "listline1".to_string(),
                        item_link_id: "item1".to_string(),
                        master_list_id: "list1".to_string(),
                        ..Default::default()
                    }],
                }],
                stock_lines: vec![
                    StockLineRow {
                        id: "stock_line1".to_string(),
                        item_link_id: "item2".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 5.0,
                        total_number_of_packs: 5.0,
                        pack_size: 1.0,
                        ..StockLineRow::default()
                    },
                    StockLineRow {
                        id: "stock_line2".to_string(),
                        item_link_id: "item3".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 0.0,
                        total_number_of_packs: 0.0,
                        pack_size: 1.0,
                        ..StockLineRow::default()
                    },
                ],
                ..MockData::default()
            },
        )
        .await;

        let service = ItemServiceCount {};
        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        // Count of total items which are visible to store b or on hand in store b
        // with visibility determined by master list & master list name join
        assert_eq!(counts.total, 2);
    }

    #[actix_rt::test]
    async fn test_no_stock_count() {
        let item_stats: Vec<ItemStats> = vec![
            // An item with some stock
            ItemStats {
                total_stock_on_hand: 1.0,
                ..Default::default()
            },
            // An item with no stock
            ItemStats {
                total_stock_on_hand: 0.0,
                ..Default::default()
            },
        ];

        let result = ItemServiceCount {}.get_no_stock_count(&item_stats);

        assert_eq!(result, 1);
    }

    #[actix_rt::test]
    async fn test_low_stock_count() {
        let low_stock_threshold = 3;
        let item_stats: Vec<ItemStats> = vec![
            // An item with the threshold stock (should not be counted)
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 3.0,
                ..Default::default()
            },
            // An item with less than the threshold stock
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 1.0,
                ..Default::default()
            },
            // An item with more than the threshold stock (should not be counted)
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 6.0,
                ..Default::default()
            },
            // An item with amc = 0 (should not be counted)
            ItemStats {
                average_monthly_consumption: 0.0,
                total_stock_on_hand: 6.0,
                ..Default::default()
            },
        ];

        let result = ItemServiceCount {}.get_low_stock_count(&item_stats, low_stock_threshold);

        assert_eq!(result, 1);
    }

    #[actix_rt::test]
    async fn test_more_than_six_mos_count() {
        let item_stats: Vec<ItemStats> = vec![
            // An item with less than 6 mos (should not be included in result)
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 3.0,
                ..Default::default()
            },
            // An item with 6 mos (should not be included in result)
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 6.0,
                ..Default::default()
            },
            // An item with more than 6 mos
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 10.0,
                ..Default::default()
            },
            // An item with amc = 0 (should not be included in result)
            ItemStats {
                average_monthly_consumption: 0.0,
                total_stock_on_hand: 6.0,
                ..Default::default()
            },
        ];

        let result = ItemServiceCount {}.get_more_than_six_months_stock_count(&item_stats);

        assert_eq!(result, 1);
    }

    #[actix_rt::test]
    async fn test_out_of_stock_products_count() {
        let ServiceTestContext {
            service_context, ..
        } = setup_all_and_service_provider(
            "omsupply-database-out-of-stock-products-count",
            MockDataInserts::all(),
        )
        .await;

        let item_ids = vec![
            "item_a".to_string(),
            "item_b".to_string(),
            "item_c".to_string(),
        ];

        let result = ItemServiceCount {}
            .get_out_of_stock_products_count(&service_context, &mock_store_b().id, item_ids)
            .unwrap();

        println!("result {:?}", result);

        assert_eq!(result, 1);
    }

    #[actix_rt::test]
    async fn test_products_at_risk_of_being_out_of_stock_count() {
        let threshold_months = 2;
        let item_stats: Vec<ItemStats> = vec![
            // Should count: 1 month of stock, amc > 0
            ItemStats {
                average_monthly_consumption: 2.0,
                total_stock_on_hand: 2.0,
                ..Default::default()
            },
            // Should NOT count: 3 months of stock, amc > 0
            ItemStats {
                average_monthly_consumption: 1.0,
                total_stock_on_hand: 3.0,
                ..Default::default()
            },
            // Should NOT count: amc = 0
            ItemStats {
                average_monthly_consumption: 0.0,
                total_stock_on_hand: 10.0,
                ..Default::default()
            },
            // Should count: 0.5 months of stock, amc > 0
            ItemStats {
                average_monthly_consumption: 4.0,
                total_stock_on_hand: 2.0,
                ..Default::default()
            },
        ];

        let result = ItemServiceCount {}
            .get_products_at_risk_of_being_out_of_stock_count(&item_stats, threshold_months);

        // Only the first and last items should be counted (months of stock < 2)
        assert_eq!(result, 2);
    }
}
