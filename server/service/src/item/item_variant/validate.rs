use repository::{
    item_variant::item_variant::{ItemVariantFilter, ItemVariantRepository},
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_item_variant_exists(
    connection: &StorageConnection,
    item_variant_id: &str,
) -> Result<bool, RepositoryError> {
    let count = ItemVariantRepository::new(connection).count(Some(
        ItemVariantFilter::new().id(EqualFilter::equal_to(item_variant_id)),
    ))?;
    Ok(count > 0)
}
