use repository::{BarcodeRowRepository, LocationRowRepository, RepositoryError, StorageConnection};

/// Some datafiles contain links to non-existing barcode references.
/// Check if the entry exists and if not return None.
pub(crate) fn clear_invalid_barcode_id(
    connection: &StorageConnection,
    barcode_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let barcode_id = if let Some(id) = barcode_id {
        BarcodeRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map(|it| it.id)
    } else {
        None
    };
    Ok(barcode_id)
}

/// Some datafiles contain links to non-existing location references.
/// Check if the entry exists and if not return None.
pub(crate) fn clear_invalid_location_id(
    connection: &StorageConnection,
    location_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let location_id = if let Some(id) = location_id {
        LocationRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map(|it| it.id)
    } else {
        None
    };
    Ok(location_id)
}
