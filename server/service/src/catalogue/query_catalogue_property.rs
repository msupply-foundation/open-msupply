use repository::{
    asset_catalogue_property::{AssetCataloguePropertyFilter, AssetCataloguePropertyRepository},
    asset_catalogue_property_row::AssetCataloguePropertyRow,
    EqualFilter, RepositoryError, StorageConnection,
};

use crate::{usize_to_u32, ListError, ListResult};

pub fn get_asset_catalogue_properties(
    connection: &StorageConnection,
    filter: Option<AssetCataloguePropertyFilter>,
) -> Result<ListResult<AssetCataloguePropertyRow>, ListError> {
    let repository = AssetCataloguePropertyRepository::new(connection);
    let rows = repository.query(filter.clone())?;
    Ok(ListResult {
        rows: rows.clone(),
        count: usize_to_u32(rows.len()),
    })
}

pub fn get_asset_catalogue_property(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetCataloguePropertyRow>, RepositoryError> {
    let repository = AssetCataloguePropertyRepository::new(connection);
    let mut result = repository.query(Some(
        AssetCataloguePropertyFilter::new().id(EqualFilter::equal_to(&id)),
    ))?;
    Ok(result.pop())
}
