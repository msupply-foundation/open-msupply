use async_graphql::*;

use graphql_core::{
    simple_generic_errors::RecordAlreadyExist,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{program_node::ProgramNode, rnr_form::RnRFormNode};
use repository::{NameRow, PeriodRow, ProgramRow, RnRFormRow};
use service::{
    auth::{Resource, ResourceAccessRequest},
    // program::insert_immunisation::{InsertRnRForm, InsertRnRFormError as ServiceError},
};

#[derive(InputObject)]
pub struct InsertRnRFormInput {
    pub id: String,
    pub supplier_id: String,
    pub program_id: String,
    pub period_id: String,
}

// impl From<InsertRnRFormInput> for InsertRnRForm {
//     fn from(input: InsertRnRFormInput) -> Self {
//         Self {
//             id: input.id,
//             name: input.name,
//         }
//     }
// }

#[derive(SimpleObject)]
pub struct InsertRnRFormError {
    pub error: InsertRnRFormErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertRnRFormErrorInterface {
    RAndRFormAlreadyExists(RecordAlreadyExist),
}

// fn map_error(error: ServiceError) -> Result<InsertRnRFormErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         // Structured errors
//         ServiceError::RnRFormAlreadyExists => {
//             return Ok(InsertRnRFormErrorInterface::ProgramAlreadyExists(
//                 RecordAlreadyExist,
//             ))
//         }

//         // Standard Graphql Errors
//         ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
//         ServiceError::DatabaseError(_) => InternalError(formatted_error),
//     };

//     Err(graphql_error.extend())
// }

#[derive(Union)]
pub enum InsertRnRFormResponse {
    Response(RnRFormNode),
    Error(InsertRnRFormError),
}

pub fn insert_rnr_form(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertRnRFormInput,
) -> Result<InsertRnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    // match service_provider
    //     .program_service
    //     .insert_rnr_form(&service_context, input.into())
    // {
    //     Ok(row) => Ok(InsertRnRFormResponse::Response(ProgramNode {
    //         program_row: row,
    //     })),
    //     Err(error) => Ok(InsertRnRFormResponse::Error(InsertRnRFormError {
    //         error: map_error(error)?,
    //     })),
    // }
    Ok(InsertRnRFormResponse::Response(RnRFormNode {
        rnr_form_row: RnRFormRow::default(),
        program_row: ProgramRow::default(),
        period_row: PeriodRow::default(),
        supplier_row: NameRow::default(),
    }))
}
