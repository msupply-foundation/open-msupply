use repository::{ EqualFilter, Item, ItemFilter, ItemRepository, ItemSort, Pagination, PaginationOption, RepositoryError, StorageConnection, StorageConnectionManager
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

    println!("Running get_item_ids_by_mos");

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

    println!("===================================> item_ids: <===========================================");
    for item in &item_ids {
        println!("{}", item);
    }

    let item_stats =
        get_item_stats_map(&connection, store_id, None, item_ids).map_err(|e| match e {
            PluginOrRepositoryError::PluginError(err) => ListError::PluginError(err.to_string()),
            PluginOrRepositoryError::RepositoryError(err) => ListError::DatabaseError(err),
        })?;
    
    println!("====================================> item_stats: <===========================================");
    for (key, value) in &item_stats {
        println!("{}: {:#?}", key, value);
    }

    let item_ids_filtered_by_mos: Vec<String> = item_stats
        .into_iter()
        .filter(|(k, v)| {
            let mut include = true;
            let mos = get_months_of_stock_on_hand(v.clone());
            if let Some(min_mos) = min_months_of_stock {
                // include if it has more than the min months of stock
                include &= (mos >= min_mos);
            }
            if let Some(max_mos) = max_months_of_stock {
                // include if it has less than the max months of stock
                include &= (mos <= max_mos);
            }
            include
        })
        .map(|(k, v)| k)
        .collect();





        // .filter_map(|(k, v)| {
        //     get_months_of_stock_on_hand(v)
        //         .filter(|&mos| {
        //             println!("key in question: {}", k);
        //             let mut include = true;
        //             if let Some(min_mos) = min_months_of_stock {
        //                 // include if it has more than the min months of stock
        //                 include &= (mos >= min_mos);
        //             }
        //             if let Some(max_mos) = max_months_of_stock {
        //                 // include if it has less than the max months of stock
        //                 include &= (mos <= max_mos);
        //             }
        //             println!("included? {}", include);
        //             include
        //         })
        //         .map(|_| k)
        // })
        // .collect();

    println!("===================================> item_ids_filtered_by_mos: <===========================================");
    for item in &item_ids_filtered_by_mos {
        println!("{}", item);
    }

    Ok(item_ids_filtered_by_mos)
}

pub fn get_months_of_stock_on_hand(item_stats: ItemStats) -> Option<f64> {
    (item_stats.average_monthly_consumption != 0.0)
        .then(|| item_stats.total_stock_on_hand / item_stats.average_monthly_consumption)
    // if amc = 0 then return mos = 0, otherwise calculate...
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
