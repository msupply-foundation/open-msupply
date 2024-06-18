use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{RecordAlreadyExist, RecordProgramCombinationAlreadyExists},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::VaccineCourseNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccine_course::insert::{InsertVaccineCourse, InsertVaccineCourseError as ServiceError},
};

pub fn insert_vaccine_course(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertVaccineCourseInput,
) -> Result<InsertVaccineCourseResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .vaccine_course_service
        .insert_vaccine_course(&service_context, input.into())
    {
        Ok(vaccine_course) => Ok(InsertVaccineCourseResponse::Response(
            VaccineCourseNode::from_domain(vaccine_course),
        )),
        Err(error) => Ok(InsertVaccineCourseResponse::Error(
            InsertVaccineCourseError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertVaccineCourseInput {
    pub id: String,
    pub name: String,
    pub program_id: String,
}

impl From<InsertVaccineCourseInput> for InsertVaccineCourse {
    fn from(
        InsertVaccineCourseInput {
            id,
            name,
            program_id,
        }: InsertVaccineCourseInput,
    ) -> Self {
        InsertVaccineCourse {
            id,
            name,
            program_id,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertVaccineCourseError {
    pub error: InsertVaccineCourseErrorInterface,
}

#[derive(Union)]
pub enum InsertVaccineCourseResponse {
    Error(InsertVaccineCourseError),
    Response(VaccineCourseNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertVaccineCourseErrorInterface {
    ItemAlreadyExists(RecordAlreadyExist),
    VaccineCourseNameExistsForThisProgram(RecordProgramCombinationAlreadyExists),
}

fn map_error(error: ServiceError) -> Result<InsertVaccineCourseErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::VaccineCourseAlreadyExists => {
            return Ok(InsertVaccineCourseErrorInterface::ItemAlreadyExists(
                RecordAlreadyExist {},
            ))
        }
        ServiceError::VaccineCourseNameExistsForThisProgram => {
            return Ok(
                InsertVaccineCourseErrorInterface::VaccineCourseNameExistsForThisProgram(
                    RecordProgramCombinationAlreadyExists {},
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::ProgramDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DemographicIndicatorDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
