use async_graphql::*;

use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::SensorNode;
use service::NullableUpdate;
use service::{
    auth::{Resource, ResourceAccessRequest},
    sensor::update::{UpdateSensor, UpdateSensorError as ServiceError},
};

pub fn update_sensor(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateSensorInput,
) -> Result<UpdateSensorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSensor,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .sensor_service
        .update_sensor(&service_context, input.into())
    {
        Ok(sensor) => Ok(UpdateSensorResponse::Response(SensorNode::from_domain(
            sensor,
        ))),
        Err(error) => Ok(UpdateSensorResponse::Error(UpdateSensorError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct UpdateSensorInput {
    pub id: String,
    pub location_id: Option<NullableUpdateInput<String>>,
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

impl From<UpdateSensorInput> for UpdateSensor {
    fn from(
        UpdateSensorInput {
            id,
            location_id,
            name,
            is_active,
        }: UpdateSensorInput,
    ) -> Self {
        UpdateSensor {
            id,
            location_id: location_id.map(|location_id| NullableUpdate {
                value: location_id.value,
            }),
            name,
            is_active,
            log_interval: None,
            battery_level: None,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateSensorError {
    pub error: UpdateSensorErrorInterface,
}

#[derive(Union)]
pub enum UpdateSensorResponse {
    Error(UpdateSensorError),
    Response(SensorNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateSensorErrorInterface {
    SensorNotFound(RecordNotFound),
    UniqueValueViolation(UniqueValueViolation),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<UpdateSensorErrorInterface> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        SensorDoesNotExist | LocationIsOnHold | SensorDoesNotBelongToCurrentStore => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        ServiceError::UpdatedRecordNotFound => StandardGraphqlError::InternalError(formatted_error),
        ServiceError::DatabaseError(_) => StandardGraphqlError::InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
