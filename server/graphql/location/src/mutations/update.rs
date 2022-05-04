use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound, UniqueValueKey,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::LocationNode;
use repository::RepositoryError;
use service::{
    location::update::{UpdateLocation, UpdateLocationError as InError},
    location::UpdateLocationError as ServiceError,
    permission_validation::{Resource, ResourceAccessRequest},
};

pub fn update_location(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateLocationInput,
) -> Result<UpdateLocationResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateLocation,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = match service_provider.context() {
        Ok(service) => service,
        Err(error) => return Ok(UpdateLocationResponse::Error(error.into())),
    };

    match service_provider.location_service.update_location(
        &service_context,
        store_id,
        input.into(),
    ) {
        Ok(location) => Ok(UpdateLocationResponse::Response(LocationNode::from_domain(
            location,
        ))),
        Err(error) => Ok(UpdateLocationResponse::Error(UpdateLocationError {
            error: map_error(error)?,
        })),
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

fn map_error(error: ServiceError) -> Result<UpdateLocationErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::LocationDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CodeAlreadyExists => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
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
            InError::UpdatedRecordNotFound => OutError::InternalError(InternalError(
                "Could not find record after updating".to_owned(),
            )),
            InError::DatabaseError(error) => OutError::DatabaseError(DatabaseError(error)),
        };
        UpdateLocationError { error }
    }
}
