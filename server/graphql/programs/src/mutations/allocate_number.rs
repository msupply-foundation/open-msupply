#[derive(InputObject)]
pub struct AllocateProgramNumberInput {
    number_name: String,
}

use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{NumberRowType, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    number::next_number,
};

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

pub async fn allocate_program_number(
    ctx: &Context<'_>,
    store_id: String,
    input: AllocateProgramNumberInput,
) -> Result<AllocateProgramNumberResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let number = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        next_number(
            &context.connection,
            &NumberRowType::Program(input.number_name),
            &store_id,
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(AllocateProgramNumberResponse::Response(NumberNode {
        number,
    }))
}
