use repository::{EqualFilter, ItemFilter, ItemRepository, RepositoryError};

use crate::{
    item_stats::{get_item_stats, ItemStatsFilter},
    service_provider::ServiceContext,
};

pub struct ItemCounts {
    pub total: i64,
    pub no_stock: i64,
    pub low_stock: i64,
    pub more_than_six_months_stock: i64,
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
        let visible_items = ItemRepository::new(&ctx.connection).query_by_filter(
            ItemFilter::new().is_visible(true).is_active(true),
            Some(store_id.to_owned()),
        )?;

        let visible_items_count = visible_items.len() as i64;

        let item_id_filter =
            EqualFilter::equal_any(visible_items.into_iter().map(|i| i.item_row.id).collect());
        let item_id_filter = Some(ItemStatsFilter::new().item_id(item_id_filter));

        let item_stats = get_item_stats(ctx, store_id, None, item_id_filter)?;

        let no_stock = item_stats
            .iter()
            .filter(|i| i.available_stock_on_hand == 0)
            .count() as i64;

        let low_stock = item_stats
            .iter()
            .filter(|&i| (i.available_stock_on_hand > 0))
            .map(|i| i.available_stock_on_hand as f64 / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock < low_stock_threshold as f64)
            .count() as i64;

        let more_than_six_months_stock = item_stats
            .iter()
            .filter(|&i| (i.available_stock_on_hand > 0))
            .map(|i| i.available_stock_on_hand as f64 / i.average_monthly_consumption)
            .filter(|months_of_stock| *months_of_stock > 6.0)
            .count() as i64;

        Ok(ItemCounts {
            total: visible_items_count,
            no_stock,
            low_stock,
            more_than_six_months_stock,
        })
    }
}

#[cfg(test)]
mod item_count_service_test {
    use chrono::{Duration, Utc};
    use repository::{
        mock::{common::FullMockMasterList, mock_store_b, MockData, MockDataInserts},
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow,
        InvoiceRowRepository, InvoiceRowType, ItemRow, ItemRowType, MasterListLineRow,
        MasterListNameJoinRow, MasterListRow, StockLineRow, StockLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        dashboard::item_count::{ItemCountServiceTrait, ItemServiceCount},
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
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item2".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item3".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item4".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item5".to_string(),
                        r#type: ItemRowType::Stock,
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
                    },
                    joins: vec![MasterListNameJoinRow {
                        id: "join1".to_string(),
                        master_list_id: "list1".to_string(),
                        name_link_id: mock_store_b().name_id,
                    }],
                    lines: vec![
                        MasterListLineRow {
                            id: "listline1".to_string(),
                            item_link_id: "item1".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline2".to_string(),
                            item_link_id: "item2".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline3".to_string(),
                            item_link_id: "item3".to_string(),
                            master_list_id: "list1".to_string(),
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

        // count of total items which are visible to store b
        // with visibility determined by master list & master list name join
        assert_eq!(3, counts.total);
    }

    #[actix_rt::test]
    async fn test_no_stock_items_count() {
        let ServiceTestContext {
            service_context, ..
        } = setup_all_with_data_and_service_provider(
            "omsupply-database-no-stock-items-count",
            MockDataInserts::none().stores().names(),
            MockData {
                items: vec![
                    ItemRow {
                        id: "item1".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item2".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item3".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item4".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item5".to_string(),
                        r#type: ItemRowType::Stock,
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
                    },
                    joins: vec![MasterListNameJoinRow {
                        id: "join1".to_string(),
                        master_list_id: "list1".to_string(),
                        name_link_id: mock_store_b().name_id,
                    }],
                    lines: vec![
                        MasterListLineRow {
                            id: "listline1".to_string(),
                            item_link_id: "item1".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline2".to_string(),
                            item_link_id: "item2".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline3".to_string(),
                            item_link_id: "item3".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                    ],
                }],
                stock_lines: vec![
                    StockLineRow {
                        id: "stock_line1".to_string(),
                        item_link_id: "item1".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 5.0,
                        pack_size: 1,
                        ..StockLineRow::default()
                    },
                    StockLineRow {
                        id: "stock_line2".to_string(),
                        item_link_id: "item2".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 0.0,
                        pack_size: 1,
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

        // count of items with no stock
        // total items: 5
        // items visible to store b: 3
        // items with no stock: 2
        // where no stock = available_number_of_packs == 0 or no stock line exists
        assert_eq!(2, counts.no_stock);

        // delete a stock line and check that the count is updated
        let stock_line_repository = StockLineRowRepository::new(&service_context.connection);
        stock_line_repository.delete("stock_line1").unwrap();

        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        // a stock line with available_number_of_packs > 0 has been removed
        assert_eq!(3, counts.no_stock);

        // Add some stock lines of 0.0 to existing item that has stock_line with 5.0, shouldn't change result
        stock_line_repository
            .upsert_one(&StockLineRow {
                id: "stock_line3".to_string(),
                item_link_id: "item1".to_string(),
                available_number_of_packs: 0.0,
                store_id: mock_store_b().id,
                ..StockLineRow::default()
            })
            .unwrap();
        stock_line_repository
            .upsert_one(&StockLineRow {
                id: "stock_line4".to_string(),
                item_link_id: "item1".to_string(),
                available_number_of_packs: 0.0,
                store_id: mock_store_b().id,
                ..StockLineRow::default()
            })
            .unwrap();
        stock_line_repository
            .upsert_one(&StockLineRow {
                id: "stock_line5".to_string(),
                item_link_id: "item1".to_string(),
                available_number_of_packs: 0.0,
                store_id: mock_store_b().id,
                ..StockLineRow::default()
            })
            .unwrap();

        let counts = service
            .get_item_counts(&service_context, "store_b", 0)
            .unwrap();

        assert_eq!(3, counts.no_stock);
    }

    #[actix_rt::test]
    async fn test_low_stock_items_count() {
        let ServiceTestContext {
            service_context, ..
        } = setup_all_with_data_and_service_provider(
            "omsupply-database-low-stock-items-count",
            MockDataInserts::none().stores().names(),
            MockData {
                items: vec![
                    ItemRow {
                        id: "item1".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item2".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item3".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item4".to_string(),
                        r#type: ItemRowType::Stock,
                        ..ItemRow::default()
                    },
                    ItemRow {
                        id: "item5".to_string(),
                        r#type: ItemRowType::Stock,
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
                    },
                    joins: vec![MasterListNameJoinRow {
                        id: "join1".to_string(),
                        master_list_id: "list1".to_string(),
                        name_link_id: mock_store_b().name_id,
                    }],
                    lines: vec![
                        MasterListLineRow {
                            id: "listline1".to_string(),
                            item_link_id: "item1".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline2".to_string(),
                            item_link_id: "item2".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                        MasterListLineRow {
                            id: "listline3".to_string(),
                            item_link_id: "item3".to_string(),
                            master_list_id: "list1".to_string(),
                        },
                    ],
                }],
                stock_lines: vec![
                    StockLineRow {
                        id: "stock_line1".to_string(),
                        item_link_id: "item1".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 5.0,
                        pack_size: 1,
                        ..StockLineRow::default()
                    },
                    StockLineRow {
                        id: "stock_line2".to_string(),
                        item_link_id: "item2".to_string(),
                        store_id: mock_store_b().id,
                        available_number_of_packs: 40.0,
                        pack_size: 1,
                        ..StockLineRow::default()
                    },
                ],
                invoices: vec![InvoiceRow {
                    id: "invoice1".to_string(),
                    name_link_id: "name_store_a".to_string(),
                    name_store_id: Some("store_a".to_string()),
                    store_id: mock_store_b().id,
                    picked_datetime: Some(Utc::now().naive_utc() - Duration::days(10)),
                    r#type: InvoiceRowType::OutboundShipment,
                    ..InvoiceRow::default()
                }],
                invoice_lines: vec![InvoiceLineRow {
                    id: "invoice_line1".to_string(),
                    invoice_id: "invoice1".to_string(),
                    item_link_id: "item2".to_string(),
                    number_of_packs: 5.0,
                    pack_size: 1,
                    r#type: InvoiceLineRowType::StockOut,
                    ..InvoiceLineRow::default()
                }],
                ..MockData::default()
            },
        )
        .await;

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
                r.id = "invoice2".to_string();
                r.name_link_id = "name_store_a".to_string();
                r.name_store_id = Some("store_a".to_string());
                r.store_id = "store_b".to_string();
                r.picked_datetime = Some(Utc::now().naive_utc() - Duration::days(10));
                r.r#type = InvoiceRowType::OutboundShipment;
            }))
            .unwrap();

        invoice_line_repository
            .upsert_one(&inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line_row_2".to_string();
                r.invoice_id = "invoice2".to_string();
                r.item_link_id = "item1".to_string();
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
