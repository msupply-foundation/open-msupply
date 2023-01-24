use repository::{
    InventoryAdjustmentReason, InventoryAdjustmentReasonFilter,
    InventoryAdjustmentReasonRepository, InventoryAdjustmentReasonSort, PaginationOption,
    StorageConnectionManager,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub fn get_inventory_adjustment_reasons(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<InventoryAdjustmentReasonFilter>,
    sort: Option<InventoryAdjustmentReasonSort>,
) -> Result<ListResult<InventoryAdjustmentReason>, ListError> {
    let pagination = get_default_pagination(pagination, u32::MAX, 1)?;
    let connection = connection_manager.connection()?;
    let repository = InventoryAdjustmentReasonRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
