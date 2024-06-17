use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    program::delete_immunisation::DeleteImmunisationProgramError as ServiceError,
};

pub fn delete_immunisation_program(
    ctx: &Context<'_>,
    immunisation_program_id: &str,
) -> Result<DeleteImmunisationProgramResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateImmunisationProgram,
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .program_service
        .delete_immunisation_program(&service_context, immunisation_program_id.to_string())
    {
        Ok(immunisation_program_id) => Ok(DeleteImmunisationProgramResponse::Response(
            DeleteResponse(immunisation_program_id),
        )),
        Err(error) => Ok(DeleteImmunisationProgramResponse::Error(
            DeleteImmunisationProgramError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(SimpleObject)]
pub struct DeleteImmunisationProgramError {
    pub error: DeleteImmunisationProgramErrorInterface,
}

#[derive(Union)]
pub enum DeleteImmunisationProgramResponse {
    Error(DeleteImmunisationProgramError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteImmunisationProgramErrorInterface {
    ImmunisationProgramNotFound(RecordNotFound),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteImmunisationProgramErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::ImmunisationProgramDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
