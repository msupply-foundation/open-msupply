use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::TemperatureBreachConfigNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_breach_config::update::{UpdateTemperatureBreachConfig, UpdateTemperatureBreachConfigError as ServiceError},
};

pub fn update_temperature_breach_config(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateTemperatureBreachConfigInput,
) -> Result<UpdateTemperatureBreachConfigResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateTemperatureBreachConfig,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .temperature_breach_config_service
        .update_temperature_breach_config(&service_context, input.into())
    {
        Ok(temperature_breach_config) => Ok(UpdateTemperatureBreachConfigResponse::Response(TemperatureBreachConfigNode::from_domain(
            temperature_breach_config,
        ))),
        Err(error) => Ok(UpdateTemperatureBreachConfigResponse::Error(UpdateTemperatureBreachConfigError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct UpdateTemperatureBreachConfigInput {
    pub id: String,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

impl From<UpdateTemperatureBreachConfigInput> for UpdateTemperatureBreachConfig {
    fn from(
        UpdateTemperatureBreachConfigInput {
            id,
            description,
            is_active,
        }: UpdateTemperatureBreachConfigInput,
    ) -> Self {
        UpdateTemperatureBreachConfig {
            id,
            description,
            is_active,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateTemperatureBreachConfigError {
    pub error: UpdateTemperatureBreachConfigErrorInterface,
}

#[derive(Union)]
pub enum UpdateTemperatureBreachConfigResponse {
    Error(UpdateTemperatureBreachConfigError),
    Response(TemperatureBreachConfigNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateTemperatureBreachConfigErrorInterface {
    TemperatureBreachConfigNotFound(RecordNotFound),
    UniqueValueViolation(UniqueValueViolation),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<UpdateTemperatureBreachConfigErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::TemperatureBreachConfigDoesNotExist => BadUserInput(formatted_error),
        ServiceError::TemperatureBreachConfigDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
