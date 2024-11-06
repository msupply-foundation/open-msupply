use repository::{
    item_variant::item_variant::{
        ItemVariant, ItemVariantFilter, ItemVariantRepository, ItemVariantSort,
    },
    PaginationOption, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_item_variants(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<ItemVariantFilter>,
    sort: Option<ItemVariantSort>,
) -> Result<ListResult<ItemVariant>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = ItemVariantRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
