use repository::{
    EqualFilter, Item, ItemFilter, ItemRepository, ItemSort, PaginationOption, RepositoryError,
    StorageConnection, StorageConnectionManager,
};

use super::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 5000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_items(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ItemFilter>,
    sort: Option<ItemSort>,
    store_id: &str,
) -> Result<ListResult<Item>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = ItemRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort, Some(store_id.to_owned()))?,
        count: i64_to_u32(repository.count(store_id.to_owned(), filter)?),
    })
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
