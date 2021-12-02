mod generate;
mod validate;

use domain::location::{Location, UpdateLocation};
use generate::generate;
use repository::{LocationRowRepository, RepositoryError};
use validate::validate;

use crate::{service_provider::ServiceContext, SingleRecordError, WithDBError};

use super::{query::LocationQueryService, LocationQueryServiceTrait};

pub trait UpdateLocationServiceTrait: Send + Sync {
    fn update_location(
        &self,
        input: UpdateLocation,
        ctx: &ServiceContext,
    ) -> Result<Location, UpdateLocationError>;
}

pub struct UpdateLocationService;

impl UpdateLocationServiceTrait for UpdateLocationService {
    fn update_location(
        &self,
        input: UpdateLocation,
        ctx: &ServiceContext,
    ) -> Result<Location, UpdateLocationError> {
        let location = ctx
            .connection
            .transaction_sync(|connection| {
                let location_row = validate(&input, &connection)?;
                let updated_location_row = generate(input, location_row);
                LocationRowRepository::new(&connection).upsert_one(&updated_location_row)?;

                LocationQueryService {}
                    .get_location(updated_location_row.id, ctx)
                    .map_err(UpdateLocationError::from)
            })
            .map_err(|error| error.to_inner_error())?;
        Ok(location)
    }
}

#[derive(PartialEq, Debug)]
pub enum UpdateLocationError {
    LocationDoesNotExist,
    CodeAlreadyExists,
    LocationDoesNotBelongToCurrentStore,
    UpdatedRecordDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpdateLocationError {
    fn from(error: RepositoryError) -> Self {
        UpdateLocationError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateLocationError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateLocationError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordDoesNotExist,
        }
    }
}

impl<E> From<WithDBError<E>> for UpdateLocationError
where
    E: Into<UpdateLocationError>,
{
    fn from(result: WithDBError<E>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod tests;
