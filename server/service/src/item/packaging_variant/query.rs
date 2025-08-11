use repository::{
    item_variant::{
        packaging_variant::{
            PackagingVariantFilter, PackagingVariantRepository, PackagingVariantSort,
        },
        packaging_variant_row::PackagingVariantRow,
    },
    PaginationOption, StorageConnection,
};

use crate::{get_pagination_or_default, i64_to_u32, ListError, ListResult};
 

pub fn get_packaging_variants(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<PackagingVariantFilter>,
    sort: Option<PackagingVariantSort>,
) -> Result<ListResult<PackagingVariantRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = PackagingVariantRepository::new(connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}
