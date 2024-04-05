use repository::{
    asset_internal_location::{AssetInternalLocationFilter, AssetInternalLocationRepository},
    asset_internal_location_row::AssetInternalLocationRow,
    asset_log_row::AssetLogStatus,
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    AssetRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_asset_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetLogRow>, RepositoryError> {
    AssetLogRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_reason_matches_status(
    _status: &Option<AssetLogStatus>,
    _reason: &Option<String>,
) -> bool {
    // TODO - add function to check reason matches status
    true
}

pub fn check_locations_are_assigned(
    location_ids: Vec<String>,
    asset_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
    Ok(
        AssetInternalLocationRepository::new(connection).query_by_filter(
            AssetInternalLocationFilter::new()
                .location_id(EqualFilter::equal_any(location_ids))
                .asset_id(EqualFilter::not_equal_to(asset_id)),
        )?,
    )
}
