#[derive(InputObject)]
pub struct AllocateProgramNumberInput {
    number_name: String,
}

use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::NumberRowType;
use service::{
    auth::{Resource, ResourceAccessRequest},
    number::next_number,
};

/// The counter behind a generated patient code. A NumberRowType::Program
/// counter for historical reasons (the generator came out of the PNG HIV
/// program work) — the name is kept so existing sequences carry on where they
/// left off, and so legacy mSupply's own generator stays in step.
const PATIENT_CODE_NUMBER_NAME: &str = "PatientCode";

pub struct NumberNode {
    pub number: i64,
}

#[Object]
impl NumberNode {
    pub async fn number(&self) -> i64 {
        self.number
    }
}

#[derive(Union)]
pub enum AllocateProgramNumberResponse {
    Response(NumberNode),
}

pub fn allocate_program_number(
    ctx: &Context<'_>,
    store_id: String,
    input: AllocateProgramNumberInput,
) -> Result<AllocateProgramNumberResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let number = next_number(
        &context.connection,
        &NumberRowType::Program(input.number_name),
        &store_id,
    )?;
    Ok(AllocateProgramNumberResponse::Response(NumberNode {
        number,
    }))
}

/// Allocate the next patient code number for the store.
///
/// Split out from `allocate_program_number` so that generating a patient code
/// costs only PatientMutate (#268). The program endpoint stays as it is: it is
/// a generic number allocator reached from program documents, where the
/// document permissions are the right gate.
pub fn allocate_patient_number(ctx: &Context<'_>, store_id: String) -> Result<NumberNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::AllocatePatientNumber,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let number = next_number(
        &context.connection,
        &NumberRowType::Program(PATIENT_CODE_NUMBER_NAME.to_string()),
        &store_id,
    )?;
    Ok(NumberNode { number })
}
