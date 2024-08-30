use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordAlreadyExist, UniqueValueViolation},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::types::program_node::ProgramNode;
use service::auth::{Resource, ResourceAccessRequest};

// Things commented out in here to appease the compiler - leaving as placeholder assuming we'll need this mutation in some form?

#[derive(InputObject)]
pub struct UpdateImmunisationProgramInput {
    pub id: String,
    pub name: String,
}

// impl From<UpdateImmunisationProgramInput> for UpdateImmunisationProgram {
//     fn from(input: UpdateImmunisationProgramInput) -> Self {
//         Self {
//             id: input.id,
//             name: input.name,
//         }
//     }
// }

#[derive(SimpleObject)]
pub struct UpdateImmunisationProgramError {
    pub error: UpdateImmunisationProgramErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateImmunisationProgramErrorInterface {
    ProgramDoesNotExist(RecordAlreadyExist),
    DuplicateName(UniqueValueViolation),
    DatabaseError(DatabaseError),
}

// fn map_error(error: ServiceError) -> Result<UpdateImmunisationProgramErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         ServiceError::ImmunisationProgramDoesNotExist => {
//             return Ok(
//                 UpdateImmunisationProgramErrorInterface::ProgramDoesNotExist(RecordAlreadyExist {}),
//             )
//         }
//         ServiceError::ImmunisationProgramNameExists => {
//             return Ok(UpdateImmunisationProgramErrorInterface::DuplicateName(
//                 UniqueValueViolation(UniqueValueKey::Name),
//             ))
//         }
//         // Standard Graphql Errors
//         ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
//         ServiceError::DatabaseError(_) => InternalError(formatted_error),
//     };

//     Err(graphql_error.extend())
// }

#[derive(Union)]
pub enum UpdateImmunisationProgramResponse {
    Response(ProgramNode),
    Error(UpdateImmunisationProgramError),
}

pub fn update_immunisation_program(
    ctx: &Context<'_>,
    store_id: String,
    _input: UpdateImmunisationProgramInput,
) -> Result<UpdateImmunisationProgramResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateImmunisationProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let _service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    todo!()

    // match service_provider
    //     .program_service
    //     .update_immunisation_program(&service_context, input.into())
    // {
    //     Ok(row) => Ok(UpdateImmunisationProgramResponse::Response(ProgramNode {
    //         program_row: row,
    //     })),
    //     Err(error) => Ok(UpdateImmunisationProgramResponse::Error(
    //         UpdateImmunisationProgramError {
    //             error: map_error(error)?,
    //         },
    //     )),
    // }
}
