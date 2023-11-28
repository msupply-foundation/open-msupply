use repository::{
    location::{LocationFilter, LocationRepository},
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_location_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = LocationRepository::new(connection)
        .count(Some(LocationFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}
