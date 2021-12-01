use domain::location::LocationFilter;
use repository::{
    schema::LocationRow, LocationRepository, LocationRowRepository, StorageConnection,
};

use crate::{current_store_id, WithDBError};

pub struct LocationWithCodeAlreadyExists;

pub fn check_location_code_is_unique(
    id: &String,
    code_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), WithDBError<LocationWithCodeAlreadyExists>> {
    if let Some(code) = code_option {
        let current_store_id = current_store_id(connection)?;
        let locations = LocationRepository::new(connection).query_by_filter(
            LocationFilter::new()
                .code(|f| f.equal_to(code))
                .id(|f| f.not_equal_to(id))
                .store_id(|f| f.equal_to(&current_store_id)),
        )?;

        if locations.len() > 0 {
            return Err(WithDBError::Error(LocationWithCodeAlreadyExists {}));
        }
    }

    Ok(())
}

pub struct LocationDoesNotExist;

pub fn check_location_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<LocationRow, WithDBError<LocationDoesNotExist>> {
    let location_option = LocationRowRepository::new(connection).find_one_by_id(id)?;

    if let Some(location) = location_option {
        Ok(location)
    } else {
        Err(WithDBError::Error(LocationDoesNotExist {}))
    }
}
