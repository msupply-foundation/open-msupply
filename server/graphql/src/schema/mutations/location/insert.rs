use async_graphql::*;
use domain::location::InsertLocation;
use repository::RepositoryError;
use service::location::insert::InsertLocationError as InError;

use crate::{
    schema::{
        mutations::{
            error::DatabaseError, RecordAlreadyExist, UniqueValueKey, UniqueValueViolation,
        },
        types::{InternalError, LocationNode},
    },
    ContextExt,
};

pub fn insert_location(ctx: &Context<'_>, input: InsertLocationInput) -> InsertLocationResponse {
    let service_provider = ctx.service_provider();
    let service_context = match service_provider.context() {
        Ok(service) => service,
        Err(error) => return InsertLocationResponse::Error(error.into()),
    };

    match service_provider
        .location_service
        .insert_location(input.into(), &service_context)
    {
        Ok(location) => InsertLocationResponse::Response(location.into()),
        Err(error) => InsertLocationResponse::Error(error.into()),
    }
}

#[derive(InputObject)]
pub struct InsertLocationInput {
    pub id: String,
    pub code: String,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

impl From<InsertLocationInput> for InsertLocation {
    fn from(
        InsertLocationInput {
            id,
            code,
            name,
            on_hold,
        }: InsertLocationInput,
    ) -> Self {
        InsertLocation {
            id,
            code,
            name,
            on_hold,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertLocationError {
    pub error: InsertLocationErrorInterface,
}

#[derive(Union)]
pub enum InsertLocationResponse {
    Error(InsertLocationError),
    Response(LocationNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertLocationErrorInterface {
    LocationAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

impl From<RepositoryError> for InsertLocationError {
    fn from(error: RepositoryError) -> Self {
        let error = InsertLocationErrorInterface::DatabaseError(DatabaseError(error));
        InsertLocationError { error }
    }
}

impl From<InError> for InsertLocationError {
    fn from(error: InError) -> Self {
        use InsertLocationErrorInterface as OutError;
        let error = match error {
            InError::LocationAlreadyExists => {
                OutError::LocationAlreadyExists(RecordAlreadyExist {})
            }
            InError::LocationWithCodeAlreadyExists => {
                OutError::UniqueValueViolation(UniqueValueViolation(UniqueValueKey::Code))
            }
            InError::CreatedRecordDoesNotExist => OutError::InternalError(InternalError(
                "Could not find record after creation".to_owned(),
            )),
            InError::DatabaseError(error) => OutError::DatabaseError(DatabaseError(error)),
        };
        InsertLocationError { error }
    }
}
