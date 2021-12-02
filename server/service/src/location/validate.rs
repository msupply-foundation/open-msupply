use domain::location::LocationFilter;
use repository::{
    schema::LocationRow, LocationRepository, LocationRowRepository, RepositoryError,
    StorageConnection,
};

use crate::current_store_id;

pub fn check_location_code_is_unique(
    id: &String,
    code_option: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    match code_option {
        None => Ok(true),
        Some(code) => {
            let current_store_id = current_store_id(connection)?;
            let locations = LocationRepository::new(connection).query_by_filter(
                LocationFilter::new()
                    .code(|f| f.equal_to(&code))
                    .id(|f| f.not_equal_to(id))
                    .store_id(|f| f.equal_to(&current_store_id)),
            )?;

            Ok(locations.len() == 0)
        }
    }
}

pub fn check_location_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<LocationRow>, RepositoryError> {
    Ok(LocationRowRepository::new(connection).find_one_by_id(id)?)
}
