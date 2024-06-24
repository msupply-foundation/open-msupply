use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordProgramCombinationAlreadyExists},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccine_course::update::{
        UpdateVaccineCourse, UpdateVaccineCourseError as ServiceError, VaccineCourseItemInput,
        VaccineCourseScheduleInput,
    },
};

use graphql_types::types::vaccine_course::VaccineCourseNode;

pub fn update_vaccine_course(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateVaccineCourseInput,
) -> Result<UpdateVaccineCourseResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateVaccineCourse,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .vaccine_course_service
        .update_vaccine_course(&service_context, input.into())
    {
        Ok(vaccine_course) => Ok(UpdateVaccineCourseResponse::Response(
            VaccineCourseNode::from_domain(vaccine_course),
        )),
        Err(error) => Ok(UpdateVaccineCourseResponse::Error(
            UpdateVaccineCourseError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct UpdateVaccineCourseScheduleInput {
    pub id: String,
    pub label: String,
    pub dose_number: i32,
}

#[derive(InputObject, Clone)]
pub struct UpdateVaccineCourseItemInput {
    pub id: String,
    pub item_id: String,
}

#[derive(InputObject, Clone)]
pub struct UpdateVaccineCourseInput {
    pub id: String,
    pub name: Option<String>,
    pub vaccine_items: Vec<UpdateVaccineCourseItemInput>,
    pub schedules: Vec<UpdateVaccineCourseScheduleInput>,
    pub demographic_indicator_id: Option<String>,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
    pub doses: i32,
}

impl From<UpdateVaccineCourseInput> for UpdateVaccineCourse {
    fn from(
        UpdateVaccineCourseInput {
            id,
            name,
            vaccine_items,
            schedules,
            demographic_indicator_id,
            coverage_rate,
            is_active,
            wastage_rate,
            doses,
        }: UpdateVaccineCourseInput,
    ) -> Self {
        UpdateVaccineCourse {
            id,
            name,
            vaccine_items: vaccine_items
                .into_iter()
                .map(|i| VaccineCourseItemInput {
                    id: i.id,
                    item_id: i.item_id,
                })
                .collect(),
            schedules: schedules
                .into_iter()
                .map(|s| VaccineCourseScheduleInput {
                    id: s.id,
                    label: s.label,
                    dose_number: s.dose_number,
                })
                .collect(),
            demographic_indicator_id,
            coverage_rate,
            is_active,
            wastage_rate,
            doses,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateVaccineCourseError {
    pub error: UpdateVaccineCourseErrorInterface,
}

#[derive(Union)]
pub enum UpdateVaccineCourseResponse {
    Error(UpdateVaccineCourseError),
    Response(VaccineCourseNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateVaccineCourseErrorInterface {
    DatabaseError(DatabaseError),
    VaccineCourseNameExistsForThisProgram(RecordProgramCombinationAlreadyExists),
}

fn map_error(error: ServiceError) -> Result<UpdateVaccineCourseErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::VaccineCourseNameExistsForThisProgram => {
            return Ok(
                UpdateVaccineCourseErrorInterface::VaccineCourseNameExistsForThisProgram(
                    RecordProgramCombinationAlreadyExists {},
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::VaccineCourseDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DemographicIndicatorDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
