use repository::{
    item_variant::{
        packaging_variant::{PackagingVariantFilter, PackagingVariantRepository},
        packaging_variant_row::PackagingVariantRow,
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_packaging_variant_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<PackagingVariantRow>, RepositoryError> {
    let packaging_variant = PackagingVariantRepository::new(connection)
        .query_by_filter(PackagingVariantFilter::new().id(EqualFilter::equal_to(id)))?
        .pop();
    Ok(packaging_variant)
}
