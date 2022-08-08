#[derive(InputObject)]
pub struct AllocateNumberInput {
    number_name: String,
}

use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use service::auth::{Resource, ResourceAccessRequest};

pub struct NumberNode {
    pub number: u64,
}

#[Object]
impl NumberNode {
    pub async fn number(&self) -> u64 {
        self.number
    }
}

#[derive(Union)]
pub enum AllocateNumberResponse {
    Response(NumberNode),
}

pub fn allocate_number(
    ctx: &Context<'_>,
    store_id: String,
    _input: AllocateNumberInput,
) -> Result<AllocateNumberResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::AllocateNumber,
            store_id: Some(store_id),
        },
    )?;

    Ok(AllocateNumberResponse::Response(NumberNode { number: 42 }))
}
