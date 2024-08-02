use async_graphql::*;

use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::NameNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    name::update::{UpdateNameProperties, UpdateNamePropertiesError as ServiceError},
};

pub fn update_name_properties(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateNamePropertiesInput,
) -> Result<UpdateNamePropertiesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateNameProperties,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider.name_service.update_name_properties(
        &service_context,
        store_id,
        input.into(),
    ) {
        Ok(name) => Ok(UpdateNamePropertiesResponse::Response(
            NameNode::from_domain(name),
        )),
        Err(error) => Ok(UpdateNamePropertiesResponse::Error(
            UpdateNamePropertiesError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject)]
pub struct UpdateNamePropertiesInput {
    pub id: String,
    pub properties: Option<String>,
}

impl From<UpdateNamePropertiesInput> for UpdateNameProperties {
    fn from(UpdateNamePropertiesInput { id, properties }: UpdateNamePropertiesInput) -> Self {
        UpdateNameProperties { id, properties }
    }
}

#[derive(SimpleObject)]
pub struct UpdateNamePropertiesError {
    pub error: UpdateNamePropertiesErrorInterface,
}

#[derive(Union)]
pub enum UpdateNamePropertiesResponse {
    Error(UpdateNamePropertiesError),
    Response(NameNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateNamePropertiesErrorInterface {
    NameNotFound(RecordNotFound),
}

fn map_error(error: ServiceError) -> Result<UpdateNamePropertiesErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured errors
        ServiceError::NameDoesNotExist => {
            return Ok(UpdateNamePropertiesErrorInterface::NameNotFound(
                RecordNotFound,
            ))
        }
        // Standard Graphql Errors
        ServiceError::UpdatedRecordNotFound | ServiceError::DatabaseError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
