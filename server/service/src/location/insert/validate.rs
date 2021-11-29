use domain::location::{InsertLocation, LocationFilter};
use repository::LocationRepository;

use crate::{
    location::validate::{check_location_code_is_unique, LocationWithCodeAlreadyExists},
    service_provider::ServiceConnection,
};

use super::InsertLocationError;

pub fn validate(
    input: &InsertLocation,
    connection: &ServiceConnection,
) -> Result<(), InsertLocationError> {
    check_location_does_not_exist(&input.id, connection)?;
    check_location_code_is_unique(&input.code, connection)?;

    // TODO Check location belongs to current store

    Ok(())
}

pub fn check_location_does_not_exist(
    id: &str,
    connection: &ServiceConnection,
) -> Result<(), InsertLocationError> {
    let locations =
        LocationRepository::new(connection).query_by_filter(LocationFilter::new().match_id(id))?;

    if locations.len() > 0 {
        Err(InsertLocationError::LocationAlreadyExists)
    } else {
        Ok(())
    }
}

impl From<LocationWithCodeAlreadyExists> for InsertLocationError {
    fn from(_: LocationWithCodeAlreadyExists) -> Self {
        InsertLocationError::LocationWithCodeAlreadyExists
    }
}
