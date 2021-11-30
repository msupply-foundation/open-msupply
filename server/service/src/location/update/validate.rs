use domain::location::UpdateLocation;
use repository::{schema::LocationRow, LocationRowRepository};

use crate::{
    location::validate::{check_location_code_is_unique, LocationWithCodeAlreadyExists},
    service_provider::ServiceConnection,
    validate::{check_record_belongs_to_current_store, RecordDoesNotBelongToCurrentStore},
};

use super::UpdateLocationError;

pub fn validate(
    input: &UpdateLocation,
    connection: &ServiceConnection,
) -> Result<LocationRow, UpdateLocationError> {
    let location_row = check_location_exists(&input.id, connection)?;
    check_location_code_is_unique(&input.id, &input.code, connection)?;

    check_record_belongs_to_current_store(&location_row.store_id, &connection)?;

    Ok(location_row)
}

pub fn check_location_exists(
    id: &str,
    connection: &ServiceConnection,
) -> Result<LocationRow, UpdateLocationError> {
    let location_option = LocationRowRepository::new(connection).find_one_by_id(id)?;

    if let Some(location) = location_option {
        Ok(location)
    } else {
        Err(UpdateLocationError::LocationDoesNotExist)
    }
}

impl From<LocationWithCodeAlreadyExists> for UpdateLocationError {
    fn from(_: LocationWithCodeAlreadyExists) -> Self {
        UpdateLocationError::CodeAlreadyExists
    }
}

impl From<RecordDoesNotBelongToCurrentStore> for UpdateLocationError {
    fn from(_: RecordDoesNotBelongToCurrentStore) -> Self {
        UpdateLocationError::LocationDoesNotBelongToCurrentStore
    }
}
