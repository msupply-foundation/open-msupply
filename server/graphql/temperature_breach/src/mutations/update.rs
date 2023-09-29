use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::TemperatureBreachNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_breach::update::{UpdateTemperatureBreach, UpdateTemperatureBreachError as ServiceError},
};

pub fn update_temperature_breach(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateTemperatureBreachInput,
) -> Result<UpdateTemperatureBreachResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateTemperatureBreach,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .temperature_breach_service
        .update_temperature_breach(&service_context, input.into())
    {
        Ok(temperature_breach) => Ok(UpdateTemperatureBreachResponse::Response(TemperatureBreachNode::from_domain(
            temperature_breach,
        ))),
        Err(error) => Ok(UpdateTemperatureBreachResponse::Error(UpdateTemperatureBreachError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct UpdateTemperatureBreachInput {
    pub id: String,
    pub acknowledged: Option<bool>,
}

impl From<UpdateTemperatureBreachInput> for UpdateTemperatureBreach {
    fn from(
        UpdateTemperatureBreachInput {
            id,
            acknowledged,
        }: UpdateTemperatureBreachInput,
    ) -> Self {
        UpdateTemperatureBreach {
            id,
            acknowledged,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateTemperatureBreachError {
    pub error: UpdateTemperatureBreachErrorInterface,
}

#[derive(Union)]
pub enum UpdateTemperatureBreachResponse {
    Error(UpdateTemperatureBreachError),
    Response(TemperatureBreachNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateTemperatureBreachErrorInterface {
    TemperatureBreachNotFound(RecordNotFound),
    UniqueValueViolation(UniqueValueViolation),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<UpdateTemperatureBreachErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::TemperatureBreachDoesNotExist => BadUserInput(formatted_error),
        ServiceError::TemperatureBreachDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
