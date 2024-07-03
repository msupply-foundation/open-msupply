use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccine_course::delete::DeleteVaccineCourseError as ServiceError,
};

pub fn delete_vaccine_course(
    ctx: &Context<'_>,
    vaccine_course_id: &str,
) -> Result<DeleteVaccineCourseResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateVaccineCourse,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .vaccine_course_service
        .delete_vaccine_course(&service_context, vaccine_course_id.to_string())
    {
        Ok(vaccine_course_id) => Ok(DeleteVaccineCourseResponse::Response(DeleteResponse(
            vaccine_course_id,
        ))),
        Err(error) => Ok(DeleteVaccineCourseResponse::Error(
            DeleteVaccineCourseError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(SimpleObject)]
pub struct DeleteVaccineCourseError {
    pub error: DeleteVaccineCourseErrorInterface,
}

#[derive(Union)]
pub enum DeleteVaccineCourseResponse {
    Error(DeleteVaccineCourseError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteVaccineCourseErrorInterface {
    VaccineCourseNotFound(RecordNotFound),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteVaccineCourseErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::VaccineCourseDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
