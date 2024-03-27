use repository::{
    asset_internal_location_row::{AssetInternalLocationRow, AssetInternalLocationRowRepository},
    RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub fn set_asset_location(
    connection: &StorageConnection,
    asset_id: &str,
    locations: Vec<String>,
) -> Result<(), RepositoryError> {
    connection
        .transaction_sync(|connection| {
            let repo = AssetInternalLocationRowRepository::new(connection);

            // delete previous locations
            match repo.delete_all_for_asset_id(asset_id) {
                Ok(r) => r,
                Err(e) => return Err(RepositoryError::from(e)),
            };

            // re insert asset locations
            for location in locations {
                let location_row = AssetInternalLocationRow {
                    id: uuid(),
                    asset_id: asset_id.to_string(),
                    location_id: location,
                };
                repo.insert_one(&location_row)?;
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}
