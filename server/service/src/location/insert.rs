use super::{query::get_location, validate::check_location_code_is_unique};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::EqualFilter;
use repository::{
    location::{Location, LocationFilter, LocationRepository},
    LocationRow, LocationRowRepository, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertLocationError {
    LocationAlreadyExists,
    LocationWithCodeAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct InsertLocation {
    pub id: String,
    pub code: String,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

pub fn insert_location(
    ctx: &ServiceContext,
    input: InsertLocation,
) -> Result<Location, InsertLocationError> {
    let location = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_location = generate(&ctx.store_id, input);
            LocationRowRepository::new(connection).upsert_one(&new_location)?;

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
    if !check_location_code_is_unique(&input.id, Some(input.code.clone()), connection)? {
        return Err(InsertLocationError::LocationWithCodeAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    store_id: &str,
    InsertLocation {
        id,
        code,
        name,
        on_hold,
    }: InsertLocation,
) -> LocationRow {
    LocationRow {
        id,
        name: name.unwrap_or(code.clone()),
        code,
        on_hold: on_hold.unwrap_or(false),
        store_id: store_id.to_string(),
    }
}

pub fn check_location_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let locations = LocationRepository::new(connection)
        .query_by_filter(LocationFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(locations.is_empty())
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
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
