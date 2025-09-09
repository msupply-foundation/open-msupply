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

    // TODO Do we want to be able to specify a custom amc_lookback_months, or just always use the default?
    // let item_stats = get_item_stats_map(ctx, store_id, item_ids)?
    //     .extract_if(|k, v| months_of_stock_on_hand(v) >= filter.months_of_stock)
    //     .collect();
    // let item_ids = Vec::from_iter(item_stats.keys());

    // let rows = if let Some(filter) = filter {
    // match filter.months_of_stock {
    // Some(months_of_stock) => {

    /*
     get id filter if mos defined
     apply to filter
     either way, return the filter
    */

    // IF MONTHS_OF_STOCK = EQUALFILTER<I32>:
    // let filter = filter.map(|mut filter| -> Result<ItemFilter, ListError> {
    //     if let Some(months_of_stock_filter) = filter.months_of_stock {
    //         if let Some(months_of_stock) = months_of_stock_filter.equal_to {
    //             let item_ids_filtered_by_mos = get_item_ids_with_mos(&connection, filter.clone(), store_id, months_of_stock as f64)?;
    //             filter = filter.id(EqualFilter::equal_any(item_ids_filtered_by_mos));
    //         }
    //     };
    //     Ok(filter)
    // }).transpose()?;


    let filter = filter.map(|mut filter| -> Result<ItemFilter, ListError> {
        if let Some(months_of_stock) = filter.months_of_stock {
            let item_ids_filtered_by_mos =
                get_item_ids_with_mos(&connection, filter.clone(), store_id, months_of_stock as f64)?;

            filter = filter.id(EqualFilter::equal_any(item_ids_filtered_by_mos));
        };
        Ok(filter)
    }).transpose()?;


    let rows = repository.query(pagination, filter.clone(), sort, Some(store_id.to_owned()))?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(store_id.to_owned(), filter)?),
    })
}

pub fn get_item_ids_with_mos(
    connection: &StorageConnection,
    filter: ItemFilter,
    store_id: &str,
    months_of_stock: f64,
) -> Result<Vec<String>, ListError> {
    let repository = ItemRepository::new(&connection);

    let item_ids = repository
        .query(
            Pagination::all(), // get all items for mos query - pagination is for final query result back to user
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
                .filter(|&mos| mos >= months_of_stock)
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
