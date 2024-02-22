use repository::{
    EqualFilter, RepositoryError, StorageConnection, AssetFilter,
    AssetRepository, AssetRow, AssetRowRepository,
};

pub fn check_asset_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let assets = AssetRepository::new(connection)
        .query_by_filter(AssetFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(assets.len() == 0)
}

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    Ok(AssetRowRepository::new(connection).find_one_by_id(id)?)
}
