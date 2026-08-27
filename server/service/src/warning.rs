use crate::{RepositoryError, SingleRecordError};
use repository::{
    EqualFilter, StorageConnectionManager, Warning, WarningFilter, WarningRepository,
};

pub fn get_warnings(
    connection_manager: &StorageConnectionManager,
    filter: Option<WarningFilter>,
) -> Result<Vec<Warning>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let repository = WarningRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(rows)
}

pub fn get_warning(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<Warning, SingleRecordError> {
    let connection = connection_manager.connection()?;
    let mut result = WarningRepository::new(&connection).query(Some(
        WarningFilter::new().id(EqualFilter::equal_to(id.to_string())),
    ))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
