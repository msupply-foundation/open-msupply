use super::{
    query::get_location,
    validate::{check_location_code_is_unique, check_location_exists},
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    location::Location, LocationRow, LocationRowRepository, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum UpdateLocationError {
    LocationDoesNotExist,
    CodeAlreadyExists,
    LocationDoesNotBelongToCurrentStore,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdateLocation {
    pub id: String,
    pub code: Option<String>,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

pub fn update_location(
    ctx: &ServiceContext,
    input: UpdateLocation,
) -> Result<Location, UpdateLocationError> {
    let location = ctx
        .connection
        .transaction_sync(|connection| {
            let location_row = validate(connection, &ctx.store_id, &input)?;
            let updated_location_row = generate(input, location_row);
            LocationRowRepository::new(connection).upsert_one(&updated_location_row)?;

            get_location(ctx, updated_location_row.id).map_err(UpdateLocationError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(location)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateLocation,
) -> Result<LocationRow, UpdateLocationError> {
    let location_row = match check_location_exists(&input.id, connection)? {
        Some(location_row) => location_row,
        None => return Err(UpdateLocationError::LocationDoesNotExist),
    };

    if !check_location_code_is_unique(&input.id, input.code.clone(), connection)? {
        return Err(UpdateLocationError::CodeAlreadyExists);
    }

    if location_row.store_id != store_id {
        return Err(UpdateLocationError::LocationDoesNotBelongToCurrentStore);
    }

    Ok(location_row)
}

pub fn generate(
    UpdateLocation {
        id: _,
        code,
        name,
        on_hold,
    }: UpdateLocation,
    mut location_row: LocationRow,
) -> LocationRow {
    location_row.code = code.unwrap_or(location_row.code);
    location_row.name = name.unwrap_or(location_row.name);
    location_row.on_hold = on_hold.unwrap_or(location_row.on_hold);
    location_row
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
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
