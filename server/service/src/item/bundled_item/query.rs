use repository::{
    item_variant::{
        bundled_item::{BundledItemFilter, BundledItemRepository},
        bundled_item_row::BundledItemRow,
    },
    PaginationOption, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_bundled_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<BundledItemFilter>,
) -> Result<ListResult<BundledItemRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = BundledItemRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
