use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, NoPermissionForThisStore, RecordAlreadyExist,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DemographicIndicatorNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    demographic::update_demographic_indicator::{
        UpdateDemographicIndicator, UpdateDemographicIndicatorError as IndicatorServiceError,
    },
};

pub fn update_demographic_indicator(
    ctx: &Context<'_>,
    input: UpdateDemographicIndicatorInput,
) -> Result<UpdateDemographicIndicatorResponse> {
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
        .update_demographic_indicator(&service_context, input.into())
    {
        Ok(demographic_indicator) => Ok(UpdateDemographicIndicatorResponse::Response(
            DemographicIndicatorNode::from_domain(demographic_indicator),
        )),
        Err(error) => Ok(UpdateDemographicIndicatorResponse::Error(
            UpdateDemographicIndicatorError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct UpdateDemographicIndicatorInput {
    pub id: String,
    pub name: Option<String>,
    pub base_year: Option<i32>,
    pub base_population: Option<i32>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<i32>,
    pub year_2_projection: Option<i32>,
    pub year_3_projection: Option<i32>,
    pub year_4_projection: Option<i32>,
    pub year_5_projection: Option<i32>,
}

impl From<UpdateDemographicIndicatorInput> for UpdateDemographicIndicator {
    fn from(
        UpdateDemographicIndicatorInput {
            id,
            base_year,
            year_1_projection,
            year_2_projection,
            year_3_projection,
            year_4_projection,
            year_5_projection,
            name,
            base_population,
            population_percentage,
        }: UpdateDemographicIndicatorInput,
    ) -> Self {
        UpdateDemographicIndicator {
            id,
            name,
            base_year,
            base_population,
            population_percentage,
            year_1_projection,
            year_2_projection,
            year_3_projection,
            year_4_projection,
            year_5_projection,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateDemographicIndicatorError {
    pub error: UpdateDemographicIndicatorErrorInterface,
}

#[derive(Union)]
pub enum UpdateDemographicIndicatorResponse {
    Error(UpdateDemographicIndicatorError),
    Response(DemographicIndicatorNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateDemographicIndicatorErrorInterface {
    DemographicIndicatorAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    PermissionError(NoPermissionForThisStore),
}

fn map_error(error: IndicatorServiceError) -> Result<UpdateDemographicIndicatorErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        IndicatorServiceError::DemographicIndicatorDoesNotExist => BadUserInput(formatted_error),
        IndicatorServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        IndicatorServiceError::DatabaseError(_) => InternalError(formatted_error),
        IndicatorServiceError::DemographicIndicatorAlreadyExistsForThisYear => {
            BadUserInput(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
