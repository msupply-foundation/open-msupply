use repository::{
    item_variant::{
        packaging_variant::{
            PackagingVariantFilter, PackagingVariantRepository, PackagingVariantSort,
        },
        packaging_variant_row::PackagingVariantRow,
    },
    PaginationOption, StorageConnection,
};

use crate::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_packaging_variants(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<PackagingVariantFilter>,
    sort: Option<PackagingVariantSort>,
) -> Result<ListResult<PackagingVariantRow>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = PackagingVariantRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
