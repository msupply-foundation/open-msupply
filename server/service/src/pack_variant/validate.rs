use repository::{
    EqualFilter, PackVariantFilter, PackVariantRepository, PackVariantRow,
    PackVariantRowRepository, RepositoryError, StorageConnection,
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

    Ok(pack_variants.len() == 0)
}

pub fn check_pack_variant_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<PackVariantRow>, RepositoryError> {
    let pack_variant = PackVariantRowRepository::new(connection).find_one_by_id(id)?;

    Ok(pack_variant)
}
