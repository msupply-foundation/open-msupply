use repository::{
    assets::asset_row::{AssetRow, AssetRowRepository},
    RepositoryError, StorageConnection,
};

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    Ok(AssetRowRepository::new(connection).find_one_by_id(id)?)
}
