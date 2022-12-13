use super::{get_inactive_store_ids, GetInactiveStoresOnSiteError};
use repository::{NumberRowRepository, RepositoryError, StorageConnection};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum DeleteNumbersError {
    #[error("{0}")]
    GetInactiveStoresOnSiteError(GetInactiveStoresOnSiteError),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
}

pub(crate) fn delete_inactive_store_numbers(
    connection: &StorageConnection,
) -> Result<(), DeleteNumbersError> {
    use DeleteNumbersError as Error;

    let number_repository = NumberRowRepository::new(&connection);

    let inactive_stores =
        get_inactive_store_ids(&connection).map_err(Error::GetInactiveStoresOnSiteError)?;

    let inactive_store_number_rows = number_repository
        .find_many_by_store_id(&inactive_stores)
        .map_err(Error::DatabaseError)?;

    for number_row in inactive_store_number_rows {
        number_repository
            .delete(&number_row.id)
            .map_err(Error::DatabaseError)?;
    }

    Ok(())
}
