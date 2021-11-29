use domain::location::LocationFilter;
use repository::LocationRepository;

use crate::{current_store_id, service_provider::ServiceConnection, WithDBError};

pub struct LocationWithCodeAlreadyExists;

pub fn check_location_code_is_unique(
    code: &str,
    connection: &ServiceConnection,
) -> Result<(), WithDBError<LocationWithCodeAlreadyExists>> {
    let locations = LocationRepository::new(connection).query_by_filter(
        LocationFilter::new()
            .match_code(code)
            .match_store_id(&current_store_id()),
    )?;

    if locations.len() > 0 {
        Err(WithDBError::Error(LocationWithCodeAlreadyExists {}))
    } else {
        Ok(())
    }
}
