use super::{get_inactive_store_ids, GetInactiveStoresOnSiteError};
use crate::service_provider::ServiceProvider;
use repository::{NumberRowRepository, RepositoryError};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum DeleteNumbersError {
    #[error("{0}")]
    GetInactiveStoresOnSiteError(GetInactiveStoresOnSiteError),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
}

pub fn delete_inactive_store_numbers(
    service_provider: &ServiceProvider,
) -> Result<(), DeleteNumbersError> {
    use DeleteNumbersError as Error;

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;
    let number_repository = NumberRowRepository::new(&ctx.connection);

    let inactive_stores =
        get_inactive_store_ids(&ctx.connection).map_err(Error::GetInactiveStoresOnSiteError)?;

    let inactive_store_numbers = number_repository.find_many_by_store_id(inactive_stores);
}
