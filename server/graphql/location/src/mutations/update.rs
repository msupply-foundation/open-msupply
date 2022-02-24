use async_graphql::*;
use domain::location::UpdateLocation;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound, UniqueValueKey,
        UniqueValueViolation,
    },
    ContextExt,
};
use graphql_types::types::LocationNode;
use repository::RepositoryError;
use service::location::update::UpdateLocationError as InError;

pub fn update_location(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateLocationInput,
) -> UpdateLocationResponse {
    let service_provider = ctx.service_provider();
    let service_context = match service_provider.context() {
        Ok(service) => service,
        Err(error) => return UpdateLocationResponse::Error(error.into()),
    };

    match service_provider.location_service.update_location(
        &service_context,
        store_id,
        input.into(),
    ) {
        Ok(location) => UpdateLocationResponse::Response(LocationNode::from_domain(location)),
        Err(error) => UpdateLocationResponse::Error(error.into()),
    }
}

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

#[derive(SimpleObject)]
pub struct UpdateLocationError {
    pub error: UpdateLocationErrorInterface,
}

#[derive(Union)]
pub enum UpdateLocationResponse {
    Error(UpdateLocationError),
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

impl From<RepositoryError> for UpdateLocationError {
    fn from(error: RepositoryError) -> Self {
        let error = UpdateLocationErrorInterface::DatabaseError(DatabaseError(error));
        UpdateLocationError { error }
    }
}

impl From<InError> for UpdateLocationError {
    fn from(error: InError) -> Self {
        use UpdateLocationErrorInterface as OutError;
        let error = match error {
            InError::LocationDoesNotExist => OutError::LocationNotFound(RecordNotFound {}),
            InError::CodeAlreadyExists => {
                OutError::UniqueValueViolation(UniqueValueViolation(UniqueValueKey::Code))
            }
            InError::LocationDoesNotBelongToCurrentStore => {
                OutError::RecordBelongsToAnotherStore(RecordBelongsToAnotherStore {})
            }
            InError::UpdatedRecordDoesNotExist => OutError::InternalError(InternalError(
                "Could not find record after updating".to_owned(),
            )),
            InError::DatabaseError(error) => OutError::DatabaseError(DatabaseError(error)),
        };
        UpdateLocationError { error }
    }
}
