use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    simple_generic_errors::RecordNotFound, standard_graphql_error::validate_auth, ContextExt,
};
use graphql_types::types::program_indicator::IndicatorValueNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::requisition::indicator_value::{UpdateIndicatorValue, UpdateIndicatorValueError};

#[derive(InputObject)]
pub struct UpdateIndicatorValueInput {
    pub id: String,
    pub value: String,
}

#[derive(Interface)]
#[graphql(name = "UpdateIndicatorValueErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateIndicatorValueError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateIndicatorValueResponse {
    Response(IndicatorValueNode),
    Error(UpdateError),
}

pub fn update(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateIndicatorValueInput,
) -> Result<UpdateIndicatorValueResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = match service_provider
        .indicator_value_service
        .update_indicator_value(&service_context, input.to_domain())
    {
        Ok(indicator_value) => {
            UpdateIndicatorValueResponse::Response(IndicatorValueNode::from_domain(indicator_value))
        }
        Err(error) => UpdateIndicatorValueResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UpdateIndicatorValueInput {
    pub fn to_domain(self) -> UpdateIndicatorValue {
        let UpdateIndicatorValueInput { id, value } = self;
        UpdateIndicatorValue { id, value }
    }
}

fn map_error(error: UpdateIndicatorValueError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:?}", error);
    let graphql_error = match error {
        // Structured Errors
        UpdateIndicatorValueError::IndicatorValueDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        // Standard graphql errors
        UpdateIndicatorValueError::NotThisStoreValue
        | UpdateIndicatorValueError::IndicatorColumnDoesNotExist
        | UpdateIndicatorValueError::ValueNotCorrectType
        | UpdateIndicatorValueError::IndicatorLineDoesNotExist => BadUserInput(formatted_error),
        UpdateIndicatorValueError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
