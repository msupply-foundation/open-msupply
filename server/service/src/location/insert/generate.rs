use domain::location::InsertLocation;
use repository::{schema::LocationRow, RepositoryError, StorageConnection};

use crate::current_store_id;

pub fn generate(
    InsertLocation {
        id,
        code,
        name,
        on_hold,
    }: InsertLocation,
    connection: &StorageConnection,
) -> Result<LocationRow, RepositoryError> {
    let result = LocationRow {
        id,
        name: name.unwrap_or(code.clone()),
        code,
        on_hold: on_hold.unwrap_or(false),
        store_id: current_store_id(connection)?,
    };

    Ok(result)
}
