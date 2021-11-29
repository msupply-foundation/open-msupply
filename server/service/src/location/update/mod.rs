mod generate;
mod validate;

use domain::location::{Location, UpdateLocation};
use generate::generate;
use repository::{LocationRowRepository, RepositoryError};
use validate::validate;

use crate::{service_provider::ServiceConnection, SingleRecordError, WithDBError};

use super::{LocationQueryService, LocationQueryServiceTrait};

pub trait UpdateLocationServiceTrait {
    fn update_location(&self, input: UpdateLocation) -> Result<Location, UpdateLocationError>;
}

pub struct UpdateLocationService<'a>(pub ServiceConnection<'a>);

impl<'a> UpdateLocationServiceTrait for UpdateLocationService<'a> {
    fn update_location(&self, input: UpdateLocation) -> Result<Location, UpdateLocationError> {
        let location = self.0.transaction(|connection| {
            let location_row = validate(&input, &connection)?;
            let updated_location_row = generate(input, location_row);
            LocationRowRepository::new(&connection).upsert_one(&updated_location_row)?;

            LocationQueryService(connection.duplicate())
                .get_location(updated_location_row.id)
                .map_err(UpdateLocationError::from)
        })?;
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
