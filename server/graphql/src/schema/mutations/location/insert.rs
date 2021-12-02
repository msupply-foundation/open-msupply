use async_graphql::*;
use domain::location::InsertLocation;
use repository::RepositoryError;
use service::location::insert::InsertLocationError;

use crate::schema::{
    mutations::{error::DatabaseError, RecordAlreadyExist, UniqueValueKey, UniqueValueViolation},
    types::{ErrorWrapper, InternalError, LocationNode},
};

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

#[derive(Union)]
pub enum InsertLocationResponse {
    Error(ErrorWrapper<InsertLocationErrorInterface>),
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

impl From<RepositoryError> for ErrorWrapper<InsertLocationErrorInterface> {
    fn from(error: RepositoryError) -> Self {
        let error = InsertLocationErrorInterface::DatabaseError(DatabaseError(error));
        ErrorWrapper { error }
    }
}

impl From<InsertLocationError> for ErrorWrapper<InsertLocationErrorInterface> {
    fn from(error: InsertLocationError) -> Self {
        use InsertLocationErrorInterface as OutError;
        let error = match error {
            InsertLocationError::LocationAlreadyExists => {
                OutError::LocationAlreadyExists(RecordAlreadyExist {})
            }
            InsertLocationError::LocationWithCodeAlreadyExists => {
                OutError::UniqueValueViolation(UniqueValueViolation(UniqueValueKey::Code))
            }
            InsertLocationError::CreatedRecordDoesNotExist => OutError::InternalError(
                InternalError("Could not find record after creation".to_owned()),
            ),
            InsertLocationError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
        };
        ErrorWrapper { error }
    }
}
