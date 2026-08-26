use repository::{
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
    ancillary_item_row::AncillaryItemRow,
    PaginationOption, StorageConnection,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_ancillary_items(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<AncillaryItemFilter>,
) -> Result<ListResult<AncillaryItemRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = AncillaryItemRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
