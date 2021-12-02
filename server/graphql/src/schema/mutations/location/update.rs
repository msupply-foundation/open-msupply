use async_graphql::*;
use domain::location::UpdateLocation;
use repository::RepositoryError;
use service::location::update::UpdateLocationError;

use crate::schema::{
    mutations::{
        error::DatabaseError, RecordBelongsToAnotherStore, UniqueValueKey, UniqueValueViolation,
    },
    types::{ErrorWrapper, InternalError, LocationNode, RecordNotFound},
};

#[derive(InputObject)]
pub struct UpdateLocationInput {
    pub id: String,
    pub code: Option<String>,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

impl From<UpdateLocationInput> for UpdateLocation {
    fn from(
        UpdateLocationInput {
            id,
            code,
            name,
            on_hold,
        }: UpdateLocationInput,
    ) -> Self {
        UpdateLocation {
            id,
            code,
            name,
            on_hold,
        }
    }
}

#[derive(Union)]
pub enum UpdateLocationResponse {
    Error(ErrorWrapper<UpdateLocationErrorInterface>),
    Response(LocationNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateLocationErrorInterface {
    LocationNotFound(RecordNotFound),
    UniqueValueViolation(UniqueValueViolation),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

impl From<RepositoryError> for ErrorWrapper<UpdateLocationErrorInterface> {
    fn from(error: RepositoryError) -> Self {
        let error = UpdateLocationErrorInterface::DatabaseError(DatabaseError(error));
        ErrorWrapper { error }
    }
}

impl From<UpdateLocationError> for ErrorWrapper<UpdateLocationErrorInterface> {
    fn from(error: UpdateLocationError) -> Self {
        use UpdateLocationErrorInterface as OutError;
        let error = match error {
            UpdateLocationError::LocationDoesNotExist => {
                OutError::LocationNotFound(RecordNotFound {})
            }
            UpdateLocationError::CodeAlreadyExists => {
                OutError::UniqueValueViolation(UniqueValueViolation(UniqueValueKey::Code))
            }
            UpdateLocationError::LocationDoesNotBelongToCurrentStore => {
                OutError::RecordBelongsToAnotherStore(RecordBelongsToAnotherStore {})
            }
            UpdateLocationError::UpdatedRecordDoesNotExist => OutError::InternalError(
                InternalError("Could not find record after updating".to_owned()),
            ),
            UpdateLocationError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
        };
        ErrorWrapper { error }
    }
}
