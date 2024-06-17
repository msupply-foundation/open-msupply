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
    demographic::insert_demographic_projection::{
        InsertDemographicProjection, InsertDemographicProjectionError as ProjectionServiceError,
    },
};

use crate::types::DemographicProjectionNode;

pub fn insert_demographic_projection(
    ctx: &Context<'_>,
    input: InsertDemographicProjectionInput,
) -> Result<InsertDemographicProjectionResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDemographic,
            store_id: Some("".to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .demographic_service
        .insert_demographic_projection(&service_context, input.into())
    {
        Ok(demographic_projection) => Ok(InsertDemographicProjectionResponse::Response(
            DemographicProjectionNode::from_domain(demographic_projection),
        )),
        Err(error) => Ok(InsertDemographicProjectionResponse::Error(
            InsertDemographicProjectionError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertDemographicProjectionInput {
    pub id: String,
    pub base_year: i32,
    pub year_1: Option<f64>,
    pub year_2: Option<f64>,
    pub year_3: Option<f64>,
    pub year_4: Option<f64>,
    pub year_5: Option<f64>,
}

impl From<InsertDemographicProjectionInput> for InsertDemographicProjection {
    fn from(
        InsertDemographicProjectionInput {
            id,
            base_year,
            year_1,
            year_2,
            year_3,
            year_4,
            year_5,
        }: InsertDemographicProjectionInput,
    ) -> Self {
        InsertDemographicProjection {
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
pub struct InsertDemographicProjectionError {
    pub error: InsertDemographicProjectionErrorInterface,
}

#[derive(Union)]
pub enum InsertDemographicProjectionResponse {
    Error(InsertDemographicProjectionError),
    Response(DemographicProjectionNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertDemographicProjectionErrorInterface {
    DemographicProjectionAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    PermissionError(NoPermissionForThisStore),
}

fn map_error(error: ProjectionServiceError) -> Result<InsertDemographicProjectionErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ProjectionServiceError::DemographicProjectionAlreadyExists => BadUserInput(formatted_error),
        ProjectionServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ProjectionServiceError::DatabaseError(_) => InternalError(formatted_error),
        ProjectionServiceError::DemographicProjectionBaseYearAlreadyExists => {
            BadUserInput(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
