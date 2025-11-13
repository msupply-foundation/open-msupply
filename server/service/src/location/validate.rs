use repository::{
    location::{LocationFilter, LocationRepository},
    LocationRow, LocationRowRepository, RepositoryError, StorageConnection,
};
use repository::{EqualFilter, StringFilter};

pub fn check_location_code_is_unique(
    id: &str,
    code_option: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    match code_option {
        None => Ok(true),
        Some(code) => {
            let locations = LocationRepository::new(connection).query_by_filter(
                LocationFilter::new()
                    .code(StringFilter::equal_to(&code))
                    .id(EqualFilter::not_equal_to(id.to_string()))
                    .store_id(EqualFilter::equal_to("store_a".to_string())),
            )?;

            Ok(locations.is_empty())
        }
    }
}

pub fn check_location_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<LocationRow>, RepositoryError> {
    LocationRowRepository::new(connection).find_one_by_id(id)
}
