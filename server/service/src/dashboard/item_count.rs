use repository::{ItemFilter, ItemRepository};

use crate::{
    item_stats::{get_item_stats, ItemStats},
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};

pub struct ItemCounts {
    pub total_count: i64,
    pub no_stock_count: i64,
    pub low_stock_count: i64,
    pub more_than_six_mos_count: i64,
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
        let no_stock_count = item_stats
            .iter()
            .filter(|i| i.available_stock_on_hand == 0.0)
            .count() as i64;

        return no_stock_count;
    }

    fn get_low_stock_count(&self, item_stats: &Vec<ItemStats>, low_stock_threshold: i32) -> i64 {
        let low_stock_count = item_stats
            .iter()
            .filter(|&i| (i.average_monthly_consumption > 0.0)) // exclude items with 0 amc from count, because we assume that means there's no consumption data so we cannot tell how many months of stock there might be.
            .map(|i| i.available_stock_on_hand / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock < low_stock_threshold as f64)
            .count() as i64;

        return low_stock_count;
    }

    fn get_more_than_six_mos_count(&self, item_stats: &Vec<ItemStats>) -> i64 {
        let more_than_six_mos_count = item_stats
            .iter()
            .filter(|&i| (i.average_monthly_consumption > 0.0)) // exclude items with 0 amc from count, because we assume that means there's no consumption data so we cannot tell how many months of stock there might be.
            .map(|i| i.available_stock_on_hand / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock > 6.0)
            .count() as i64;

        return more_than_six_mos_count;
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
            Some(store_id.to_owned()),
        )?;

        let total_count = *&visible_or_on_hand_items.len() as i64;

        let item_ids = visible_or_on_hand_items
            .into_iter()
            .map(|i| i.item_row.id)
            .collect();

        let item_stats = get_item_stats(&ctx.connection, store_id, None, item_ids)?;

        let no_stock_count = Self::get_no_stock_count(&self, &item_stats);

        let low_stock_count = Self::get_low_stock_count(&self, &item_stats, low_stock_threshold);

        let more_than_six_mos_count = Self::get_more_than_six_mos_count(&self, &item_stats);

        Ok(ItemCounts {
            total_count,
            no_stock_count,
            low_stock_count,
            more_than_six_mos_count,
        })
    }
}
#[cfg(test)]
mod item_count_service_test {

    use repository::{
        mock::{common::FullMockMasterList, mock_store_b, MockData, MockDataInserts},
        ItemRow, ItemType, MasterListLineRow, MasterListNameJoinRow, MasterListRow,
    };

    use crate::{
        dashboard::item_count::{ItemCountServiceTrait, ItemServiceCount},
        item_stats::ItemStats,
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn test_total_items_count() {
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
                    ItemRow {
                        id: "item5".to_string(),
                        r#type: ItemType::Stock,
                        ..ItemRow::default()
                    },
                ],
                stock_on_hand: vec![],
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
                    lines: vec![
                        MasterListLineRow {
                            id: "listline1".to_string(),
                            item_link_id: "item1".to_string(),
                            master_list_id: "list1".to_string(),
                            ..Default::default()
                        },
                        MasterListLineRow {
                            id: "listline2".to_string(),
                            item_link_id: "item2".to_string(),
                            master_list_id: "list1".to_string(),
                            ..Default::default()
                        },
                        MasterListLineRow {
                            id: "listline3".to_string(),
                            item_link_id: "item3".to_string(),
                            master_list_id: "list1".to_string(),
                            ..Default::default()
                        },
                    ],
                }],
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
        assert_eq!(5, counts.total_count);
    }

    #[actix_rt::test]
    async fn test_no_stock_count() {
        let item_stats: Vec<ItemStats> = vec![
            // An item with some stock
            ItemStats {
                available_stock_on_hand: 1.0,
                ..Default::default()
            },
            // An item with no stock
            ItemStats {
                available_stock_on_hand: 0.0,
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
                available_stock_on_hand: 1.0,
                ..Default::default()
            },
            // An item with more than the threshold stock (should not be counted)
            ItemStats {
                average_monthly_consumption: 1.0,
                available_stock_on_hand: 6.0,
                ..Default::default()
            },
            // An item with amc = 0 (should not be counted)
            ItemStats {
                average_monthly_consumption: 0.0,
                available_stock_on_hand: 6.0,
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
                available_stock_on_hand: 3.0,
                ..Default::default()
            },
            // An item with 6 mos (should not be included in result)
            ItemStats {
                average_monthly_consumption: 1.0,
                available_stock_on_hand: 6.0,
                ..Default::default()
            },
            // An item with more than 6 mos
            ItemStats {
                average_monthly_consumption: 1.0,
                available_stock_on_hand: 10.0,
                ..Default::default()
            },
            // An item with amc = 0 (should not be included in result)
            ItemStats {
                average_monthly_consumption: 0.0,
                available_stock_on_hand: 6.0,
                ..Default::default()
            },
        ];

        let result = ItemServiceCount {}.get_more_than_six_mos_count(&item_stats);

        assert_eq!(result, 1);
    }
}
