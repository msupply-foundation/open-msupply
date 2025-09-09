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

    // N.B. this way of doing it means that if both the more_than_months_of_stock and less_than_months_of_stock filters are used, the query will ignore the less_than filter.
    let filter = filter.map(|mut filter| -> Result<ItemFilter, ListError> {
        if let Some(comparison_months_of_stock) = filter.more_than_months_of_stock {
            // call get_item_ids_by_mos() with more_than = true so it will only return ids of the items that have more than that many months of stock
            let item_ids_filtered_by_mos =
                get_item_ids_by_mos(&connection, filter.clone(), true, store_id, comparison_months_of_stock as f64)?;

            filter = filter.id(EqualFilter::equal_any(item_ids_filtered_by_mos));
        } else if let Some(comparison_months_of_stock) = filter.less_than_months_of_stock {
            // call get_item_ids_by_mos() with more_than = false so it will only return ids of the items that have less than that many months of stock
            let item_ids_filtered_by_mos =
                get_item_ids_by_mos(&connection, filter.clone(), false, store_id, comparison_months_of_stock as f64)?;

            filter = filter.id(EqualFilter::equal_any(item_ids_filtered_by_mos));
        }
        Ok(filter)
    }).transpose()?;


    let rows = repository.query(pagination, filter.clone(), sort, Some(store_id.to_owned()))?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(store_id.to_owned(), filter)?),
    })
}

pub fn get_item_ids_by_mos(
    connection: &StorageConnection,
    filter: ItemFilter,
    more_than: bool,
    store_id: &str,
    comparison_months_of_stock: f64,
) -> Result<Vec<String>, ListError> {
    let repository = ItemRepository::new(&connection);
    let more_than = more_than;
    let comparison_months_of_stock = comparison_months_of_stock;
    
    let item_ids = repository
        .query(
            Pagination::all(), // get all items so we can then filter them by mos in the next - we'll use pagination for the query that will be returned to the user.
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

    let item_ids_filtered_by_mos: Vec<String> = item_stats
        .into_iter()
        .filter_map(|(k, v)| {
            months_of_stock_on_hand(v)
                .filter(|&mos| {
                    if more_than {
                        // if user has used the more_than_months_of_stock filter, only return ids of items that have more than or equal to that many months of stock available.
                        mos >= comparison_months_of_stock
                    } else {
                        // if user has used the less_than_months_of_stock filter, only return ids of items that have less than or equal to that many months of stock available.
                        mos <= comparison_months_of_stock
                    }
                })
                .map(|_| k)
        })
        .collect();

    Ok(item_ids_filtered_by_mos)
}

pub fn months_of_stock_on_hand(item_stats: ItemStats) -> Option<f64> {
    (item_stats.average_monthly_consumption != 0.0)
        .then(|| item_stats.total_stock_on_hand / item_stats.average_monthly_consumption)
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
