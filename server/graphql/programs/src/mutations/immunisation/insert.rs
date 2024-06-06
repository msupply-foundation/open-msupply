use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::program_node::ProgramNode;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
pub struct InsertImmunisationProgramInput {
    pub id: String,
    pub name: String,
}

#[derive(Union)]
pub enum InsertImmunisationProgramResponse {
    Response(ProgramNode),
}

pub fn insert_immunisation_program(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertImmunisationProgramInput,
) -> Result<InsertImmunisationProgramResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    todo!("Insert immunisation program")
}
