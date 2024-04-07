use repository::{
    EqualFilter, PackVariantFilter, PackVariantRepository, PackVariantRow, RepositoryError,
    StorageConnection,
};

pub fn check_pack_size_is_unique(
    connection: &StorageConnection,
    item_id: &str,
    pack_size: i32,
) -> Result<bool, RepositoryError> {
    let pack_variants = PackVariantRepository::new(connection).query_by_filter(
        PackVariantFilter::new()
            .item_id(EqualFilter::equal_to(item_id))
            .pack_size(EqualFilter::equal_to_i32(pack_size))
            .is_active(true),
    )?;

    Ok(pack_variants.is_empty())
}

pub fn check_pack_variant_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<PackVariantRow>, RepositoryError> {
    let pack_variant = PackVariantRepository::new(connection)
        .query_by_filter(
            PackVariantFilter::new()
                .id(EqualFilter::equal_to(id))
                .is_active(true),
        )?
        .pop();
    Ok(pack_variant)
}
