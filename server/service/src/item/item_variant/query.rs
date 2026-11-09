use crate::{ListError, ListResult, get_pagination_or_default, i64_to_u32};
use repository::{
    PaginationOption, StorageConnection,
    item_variant::item_variant::{
        ItemVariant, ItemVariantFilter, ItemVariantRepository, ItemVariantSort,
    },
};

pub fn get_item_variants(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<ItemVariantFilter>,
    sort: Option<ItemVariantSort>,
) -> Result<ListResult<ItemVariant>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = ItemVariantRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
