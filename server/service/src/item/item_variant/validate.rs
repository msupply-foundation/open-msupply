use repository::{
    item_variant::{
        item_variant::{ItemVariantFilter, ItemVariantRepository},
        item_variant_row::ItemVariantRow,
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_item_variant_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ItemVariantRow>, RepositoryError> {
    let item_variant = ItemVariantRepository::new(connection)
        .query_by_filter(ItemVariantFilter::new().id(EqualFilter::equal_to(id)))?
        .pop();
    Ok(item_variant)
}
