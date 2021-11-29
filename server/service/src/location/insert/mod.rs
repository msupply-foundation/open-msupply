mod generate;
mod validate;

use domain::location::{InsertLocation, Location};
use generate::generate;
use repository::{LocationRowRepository, RepositoryError};
use validate::validate;

use crate::{service_provider::ServiceConnection, SingleRecordError, WithDBError};

use super::{LocationQueryService, LocationQueryServiceTrait};

pub trait InsertLocationServiceTrait {
    fn insert_location(&self, input: InsertLocation) -> Result<Location, InsertLocationError>;
}

pub struct InsertLocationService<'a>(pub ServiceConnection<'a>);

impl<'a> InsertLocationServiceTrait for InsertLocationService<'a> {
    fn insert_location(&self, input: InsertLocation) -> Result<Location, InsertLocationError> {
        let location = self.0.transaction(|connection| {
            validate(&input, &connection)?;
            let new_location = generate(input);
            LocationRowRepository::new(&connection).upsert_one(&new_location)?;

            LocationQueryService(connection.duplicate())
                .get_location(new_location.id)
                .map_err(InsertLocationError::from)
        })?;
        Ok(location)
    }
}

#[derive(PartialEq, Debug)]
pub enum InsertLocationError {
    LocationAlreadyExists,
    LocationWithCodeAlreadyExists,
    CreatedRecordDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertLocationError {
    fn from(error: RepositoryError) -> Self {
        InsertLocationError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertLocationError {
    fn from(error: SingleRecordError) -> Self {
        use InsertLocationError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordDoesNotExist,
        }
    }
}

impl<E> From<WithDBError<E>> for InsertLocationError
where
    E: Into<InsertLocationError>,
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
