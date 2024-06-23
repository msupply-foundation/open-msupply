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
    demographic::insert_demographic_indicator::{
        InsertDemographicIndicator, InsertDemographicIndicatorError as IndicatorServiceError,
    },
};

pub fn insert_demographic_indicator(
    ctx: &Context<'_>,
    input: InsertDemographicIndicatorInput,
) -> Result<InsertDemographicIndicatorResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDemographic,
            store_id: None,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .demographic_service
        .insert_demographic_indicator(&service_context, input.into())
    {
        Ok(demographic_indicator) => Ok(InsertDemographicIndicatorResponse::Response(
            DemographicIndicatorNode::from_domain(demographic_indicator),
        )),
        Err(error) => Ok(InsertDemographicIndicatorResponse::Error(
            InsertDemographicIndicatorError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertDemographicIndicatorInput {
    pub id: String,
    pub name: Option<String>,
    pub base_year: i32,
    pub base_population: Option<i32>,
    pub population_percentage: Option<f64>,
    pub year_1_projection: Option<i32>,
    pub year_2_projection: Option<i32>,
    pub year_3_projection: Option<i32>,
    pub year_4_projection: Option<i32>,
    pub year_5_projection: Option<i32>,
}

impl From<InsertDemographicIndicatorInput> for InsertDemographicIndicator {
    fn from(
        InsertDemographicIndicatorInput {
            id,
            name,
            base_population,
            base_year,
            population_percentage,
            year_1_projection,
            year_2_projection,
            year_3_projection,
            year_4_projection,
            year_5_projection,
        }: InsertDemographicIndicatorInput,
    ) -> Self {
        InsertDemographicIndicator {
            id,
            name,
            base_population,
            base_year,
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
pub struct InsertDemographicIndicatorError {
    pub error: InsertDemographicIndicatorErrorInterface,
}

#[derive(Union)]
pub enum InsertDemographicIndicatorResponse {
    Error(InsertDemographicIndicatorError),
    Response(DemographicIndicatorNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertDemographicIndicatorErrorInterface {
    DemographicIndicatorAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    PermissionError(NoPermissionForThisStore),
}

fn map_error(error: IndicatorServiceError) -> Result<InsertDemographicIndicatorErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        IndicatorServiceError::DemographicIndicatorAlreadyExists => BadUserInput(formatted_error),
        IndicatorServiceError::DemographicIndicatorAlreadyExistsForThisYear => {
            BadUserInput(formatted_error)
        }
        IndicatorServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        IndicatorServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
