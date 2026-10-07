use repository::{
    PaginationOption, StorageConnection,
    item_variant::{
        bundled_item::{BundledItemFilter, BundledItemRepository},
        bundled_item_row::BundledItemRow,
    },
};

use crate::{ListError, ListResult, get_pagination_or_default, i64_to_u32};

pub fn get_bundled_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<BundledItemFilter>,
) -> Result<ListResult<BundledItemRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = BundledItemRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
