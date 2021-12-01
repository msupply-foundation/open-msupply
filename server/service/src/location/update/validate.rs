use domain::location::UpdateLocation;
use repository::{schema::LocationRow, StorageConnection};

use crate::{
    location::validate::{
        check_location_code_is_unique, check_location_exists, LocationDoesNotExist,
        LocationWithCodeAlreadyExists,
    },
    validate::{check_record_belongs_to_current_store, RecordDoesNotBelongToCurrentStore},
};

use super::UpdateLocationError;

pub fn validate(
    input: &UpdateLocation,
    connection: &StorageConnection,
) -> Result<LocationRow, UpdateLocationError> {
    let location_row = check_location_exists(&input.id, connection)?;
    check_location_code_is_unique(&input.id, &input.code, connection)?;

    check_record_belongs_to_current_store(&location_row.store_id, &connection)?;

    Ok(location_row)
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

impl From<LocationDoesNotExist> for UpdateLocationError {
    fn from(_: LocationDoesNotExist) -> Self {
        UpdateLocationError::LocationDoesNotExist
    }
}
