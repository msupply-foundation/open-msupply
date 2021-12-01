use super::{query::get_location, validate::check_location_code_is_unique};
use crate::{current_store_id, service_provider::ServiceContext, SingleRecordError};
use domain::{
    location::{InsertLocation, Location, LocationFilter},
    EqualFilter,
};
use repository::{
    schema::LocationRow, LocationRepository, LocationRowRepository, RepositoryError,
    StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertLocationError {
    LocationAlreadyExists,
    LocationWithCodeAlreadyExists,
    CreatedRecordDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_location(
    ctx: &ServiceContext,
    input: InsertLocation,
) -> Result<Location, InsertLocationError> {
    let location = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_location = generate(input, connection)?;
            LocationRowRepository::new(&connection).upsert_one(&new_location)?;

            get_location(ctx, new_location.id).map_err(InsertLocationError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(location)
}

pub fn validate(
    input: &InsertLocation,
    connection: &StorageConnection,
) -> Result<(), InsertLocationError> {
    if !check_location_does_not_exist(&input.id, connection)? {
        return Err(InsertLocationError::LocationAlreadyExists);
    }
    if !check_location_code_is_unique(&input.id, &input.code, connection)? {
        return Err(InsertLocationError::LocationWithCodeAlreadyExists);
    }

    Ok(())
}

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

pub fn check_location_does_not_exist(
    id: &String,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let locations = LocationRepository::new(connection)
        .query_by_filter(LocationFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(locations.len() == 0)
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
