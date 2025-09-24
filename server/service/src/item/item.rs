use std::collections::HashMap;

use repository::{
    EqualFilter, Item, ItemFilter, ItemRepository, ItemSort, Pagination, PaginationOption,
    RepositoryError, StorageConnection, StorageConnectionManager,
};

use crate::{
    get_pagination_or_default, i64_to_u32,
    item_stats::{get_item_stats_map, ItemStats},
    ListError, ListResult, PluginOrRepositoryError,
};

pub const MAX_LIMIT: u32 = 5000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_items(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ItemFilter>,
    sort: Option<ItemSort>,
    store_id: &str,
) -> Result<ListResult<Item>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let connection = connection_manager.connection()?;
    let repository = ItemRepository::new(&connection);

    let filter = filter
        .map(|mut filter| -> Result<ItemFilter, ListError> {
            // If there is a filter for either min or max months of stock...
            if filter.min_months_of_stock.is_some() || filter.max_months_of_stock.is_some() {
                // ...then produce a list of item ids that have <= the max and >= the min months of stock...
                let item_ids_filtered_by_mos = get_item_ids_by_mos(
                    &connection,
                    filter.clone(),
                    store_id,
                    filter.min_months_of_stock,
                    filter.max_months_of_stock,
                )?;
                // ...and filter for only those ids.
                filter = filter.id(EqualFilter::equal_any(item_ids_filtered_by_mos));
            }
            Ok(filter)
        })
        .transpose()?;

    let rows = repository.query(pagination, filter.clone(), sort, Some(store_id.to_owned()))?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(store_id.to_owned(), filter)?),
    })
}

pub fn get_item_ids_by_mos(
    connection: &StorageConnection,
    filter: ItemFilter,
    store_id: &str,
    min_months_of_stock: Option<f64>,
    max_months_of_stock: Option<f64>,
) -> Result<Vec<String>, ListError> {
    let repository = ItemRepository::new(&connection);

    let item_ids = repository
        .query(
            Pagination::all(), // get all items so we can then filter them by mos in the next part. We'll use pagination for the query that will be returned to the user.
            Some(filter),
            None,
            Some(store_id.to_owned()),
        )?
        .iter()
        .map(|item| item.item_row.id.clone())
        .collect();

    let item_stats =
        get_item_stats_map(&connection, store_id, None, item_ids).map_err(|e| match e {
            PluginOrRepositoryError::PluginError(err) => ListError::PluginError(err.to_string()),
            PluginOrRepositoryError::RepositoryError(err) => ListError::DatabaseError(err),
        })?;

    let item_ids_filtered_by_mos: Vec<String> =
        get_items_ids_for_months_of_stock(item_stats, min_months_of_stock, max_months_of_stock);

    Ok(item_ids_filtered_by_mos)
}

pub fn get_items_ids_for_months_of_stock(
    item_stats: HashMap<String, ItemStats>,
    min_months_of_stock: Option<f64>,
    max_months_of_stock: Option<f64>,
) -> Vec<String> {
    if min_months_of_stock.is_none() || max_months_of_stock.is_none() {
        return item_stats.into_iter().map(|(k, _v)| k).collect();
    }
    item_stats
        .into_iter()
        .filter_map(|(k, v)| {
            let mos = v.total_stock_on_hand / v.average_monthly_consumption;
            let mut include = true;

            if let Some(min_mos) = min_months_of_stock {
                // include if it has more than the min months of stock
                include &= mos >= min_mos;
            }
            if let Some(max_mos) = max_months_of_stock {
                // include if it has less than the max months of stock
                include &= mos <= max_mos;
            }
            if v.average_monthly_consumption == 0.0 {
                // If amc = 0, assume this is because there's no consumption data, so we cannot determine how many months of stock there are, so we'll exclude that item
                include = false;
            }
            include.then(|| k)
        })
        .collect()
}

pub fn check_item_exists(
    connection: &StorageConnection,
    store_id: String,
    item_id: &str,
) -> Result<bool, RepositoryError> {
    let count = ItemRepository::new(connection).count(
        store_id,
        Some(ItemFilter::new().id(EqualFilter::equal_to(item_id))),
    )?;
    Ok(count > 0)
}

pub fn get_item(
    connection: &StorageConnection,
    store_id: String,
    item_id: &str,
) -> Result<Option<Item>, RepositoryError> {
    Ok(ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new().id(EqualFilter::equal_to(item_id)),
            Some(store_id),
        )?
        .pop())
}

#[cfg(test)]
mod test {
    mod test_get_items_ids_for_months_of_stock {
        use std::collections::HashMap;

        use crate::{item::get_items_ids_for_months_of_stock, item_stats::ItemStats};

        #[test]
        fn excludes_items_with_0_amc() {
            let min_months_of_stock = None;
            let max_months_of_stock = Some(3.0);
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    // total_consumption: 0.0,
                    average_monthly_consumption: 0.0,
                    ..Default::default()
                },
            );

            let result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            assert_eq!(result, Vec::<String>::new());
        }

        #[test]
        fn returns_without_filtering_if_no_filters_provided() {
            let min_months_of_stock = None;
            let max_months_of_stock = None;
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    total_consumption: 0.0,
                    average_monthly_consumption: 0.0,
                    ..Default::default()
                },
            );

            let result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            assert_eq!(result, ["item_1".to_string()]);
        }

        #[test]
        fn filters_when_min_mos_provided() {
            let min_months_of_stock = Some(3.0);
            let max_months_of_stock = None;
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    // This item has 5 MOS on hand, more than min_months_of_stock
                    average_monthly_consumption: 2.0,
                    total_stock_on_hand: 10.0,
                    ..Default::default()
                },
            );
            item_stats.insert(
                "item_2".to_string(),
                ItemStats {
                    // This item has 2 MOS on hand, less than min_months_of_stock
                    average_monthly_consumption: 5.0,
                    total_stock_on_hand: 10.0,
                    ..Default::default()
                },
            );

            let result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            assert_eq!(result, ["item_1".to_string()]);
        }

        #[test]
        fn filters_when_max_mos_provided() {
            let min_months_of_stock = None;
            let max_months_of_stock = Some(6.0);
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    // This item has 1 MOS on hand, which is less than the maximum
                    average_monthly_consumption: 3.0,
                    total_stock_on_hand: 3.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_2".to_string(),
                ItemStats {
                    // This item has 6 MOS on hand, which is less than the maximum
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 6.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_3".to_string(),
                ItemStats {
                    // This item has 7 MOS on hand, which is more than the maximum
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 7.0,
                    ..Default::default()
                },
            );

            let mut result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            // It is necessary to sort result as it is made from a hashmap, and hashmaps are processed in a different order each time.
            result.sort();

            assert_eq!(result, ["item_1".to_string(), "item_2".to_string()]);
        }

        #[test]
        fn filters_when_min_and_max_provided() {
            let min_months_of_stock = Some(3.0);
            let max_months_of_stock = Some(6.0);
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    // This item has 1 MOS on hand, less than min_months_of_stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 1.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_2".to_string(),
                ItemStats {
                    // This item has 7 MOS on hand, more than max_months_of_stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 7.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_3".to_string(),
                ItemStats {
                    // This item has 5 MOS on hand, within the range of min and max months of stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 5.0,
                    ..Default::default()
                },
            );

            let result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            assert_eq!(result, ["item_3".to_string()]);
        }

        #[test]
        fn filters_when_min_and_max_incompatible() {
            // max MOS less than min MOS so no results can be returned

            let max_months_of_stock = Some(3.0);
            let min_months_of_stock = Some(6.0);
            let mut item_stats = HashMap::new();

            item_stats.insert(
                "item_1".to_string(),
                ItemStats {
                    // This item has 1 MOS on hand, which is less than min_months_of_stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 1.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_2".to_string(),
                ItemStats {
                    // This item has 7 MOS on hand, which is more than max_months_of_stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 7.0,
                    ..Default::default()
                },
            );

            item_stats.insert(
                "item_3".to_string(),
                ItemStats {
                    // This item has 5 MOS on hand, which is less than min_months_of_stock
                    average_monthly_consumption: 1.0,
                    total_stock_on_hand: 5.0,
                    ..Default::default()
                },
            );

            let result = get_items_ids_for_months_of_stock(
                item_stats,
                min_months_of_stock,
                max_months_of_stock,
            );

            assert_eq!(result, Vec::<String>::new());
        }
    }
}
