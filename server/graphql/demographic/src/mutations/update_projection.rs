use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, NoPermissionForThisStore, RecordAlreadyExist,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    demographic::update_demographic_projection::{
        UpdateDemographicProjection, UpdateDemographicProjectionError as ProjectionServiceError,
    },
};

use crate::types::DemographicProjectionNode;

pub fn update_demographic_projection(
    ctx: &Context<'_>,
    input: UpdateDemographicProjectionInput,
) -> Result<UpdateDemographicProjectionResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some("".to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .demographic_service
        .update_demographic_projection(&service_context, input.into())
    {
        Ok(demographic_projection) => Ok(UpdateDemographicProjectionResponse::Response(
            DemographicProjectionNode::from_domain(demographic_projection),
        )),
        Err(error) => Ok(UpdateDemographicProjectionResponse::Error(
            UpdateDemographicProjectionError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct UpdateDemographicProjectionInput {
    pub id: String,
    pub base_year: Option<i16>,
    pub year_1: Option<f64>,
    pub year_2: Option<f64>,
    pub year_3: Option<f64>,
    pub year_4: Option<f64>,
    pub year_5: Option<f64>,
}

impl From<UpdateDemographicProjectionInput> for UpdateDemographicProjection {
    fn from(
        UpdateDemographicProjectionInput {
            id,
            base_year,
            year_1,
            year_2,
            year_3,
            year_4,
            year_5,
        }: UpdateDemographicProjectionInput,
    ) -> Self {
        UpdateDemographicProjection {
            id,
            base_year,
            year_1,
            year_2,
            year_3,
            year_4,
            year_5,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateDemographicProjectionError {
    pub error: UpdateDemographicProjectionErrorInterface,
}

#[derive(Union)]
pub enum UpdateDemographicProjectionResponse {
    Error(UpdateDemographicProjectionError),
    Response(DemographicProjectionNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateDemographicProjectionErrorInterface {
    DemographicProjectionAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    PermissionError(NoPermissionForThisStore),
}

fn map_error(error: ProjectionServiceError) -> Result<UpdateDemographicProjectionErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ProjectionServiceError::DemographicProjectionDoesNotExist => BadUserInput(formatted_error),
        ProjectionServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ProjectionServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
