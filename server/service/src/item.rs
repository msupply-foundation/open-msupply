use repository::PaginationOption;
use repository::{Item, ItemFilter, ItemRepository, ItemSort, StorageConnectionManager};

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
