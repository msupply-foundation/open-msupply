use domain::location::LocationFilter;
use repository::LocationRepository;

use crate::{current_store_id, service_provider::ServiceConnection, WithDBError};

pub struct LocationWithCodeAlreadyExists;

pub fn check_location_code_is_unique(
    id: &String,
    code_option: &Option<String>,
    connection: &ServiceConnection,
) -> Result<(), WithDBError<LocationWithCodeAlreadyExists>> {
    if let Some(code) = code_option {
        let locations = LocationRepository::new(connection).query_by_filter(
            LocationFilter::new()
                .code(|f| f.equal_to(code))
                .id(|f| f.not_equal_to(id))
                .store_id(|f| f.equal_to(&current_store_id())),
        )?;

        if locations.len() > 0 {
            return Err(WithDBError::Error(LocationWithCodeAlreadyExists {}));
        }
    }
    Ok(())
}
