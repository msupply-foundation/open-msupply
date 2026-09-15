use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use service::auth::{Resource, ResourceAccessRequest};
use service::stock_relocation_line::{
    BatchStockRelocationLine as ServiceInput, BatchStockRelocationLineResult as ServiceResult,
};

use super::delete::{map_delete_response, DeleteLineResponse};
use super::upsert::{map_upsert_response, UpsertLineInput, UpsertLineResponse};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "UpsertStockRelocationLineResponseWithId",
    params(UpsertLineResponse)
))]
#[graphql(concrete(
    name = "DeleteStockRelocationLineResponseWithId",
    params(DeleteLineResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(InputObject)]
#[graphql(name = "BatchStockRelocationLineInput")]
pub struct BatchLineInput {
    pub upsert: Option<Vec<UpsertLineInput>>,
    pub delete: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

impl BatchLineInput {
    fn to_domain(self) -> ServiceInput {
        let BatchLineInput {
            upsert,
            delete,
            continue_on_error,
        } = self;
        ServiceInput {
            upsert: upsert
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete,
            continue_on_error,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "BatchStockRelocationLineResponse")]
pub struct BatchLineResponse {
    upsert: Option<Vec<MutationWithId<UpsertLineResponse>>>,
    delete: Option<Vec<MutationWithId<DeleteLineResponse>>>,
}

pub fn batch_stock_relocation_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchLineInput,
) -> Result<BatchLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .stock_relocation_service
        .batch_stock_relocation_line(&service_context, store_id, input.to_domain())?;

    map_response(response)
}

fn map_response(ServiceResult { upsert, delete }: ServiceResult) -> Result<BatchLineResponse> {
    let mut upsert_result = Vec::new();
    for line in upsert {
        upsert_result.push(MutationWithId {
            id: line.input.id.clone(),
            response: map_upsert_response(line.result)?,
        });
    }

    let mut delete_result = Vec::new();
    for line in delete {
        delete_result.push(MutationWithId {
            id: line.input.clone(),
            response: map_delete_response(line.result)?,
        });
    }

    Ok(BatchLineResponse {
        upsert: vec_or_none(upsert_result),
        delete: vec_or_none(delete_result),
    })
}

fn vec_or_none<T>(vec: Vec<T>) -> Option<Vec<T>> {
    if vec.is_empty() {
        None
    } else {
        Some(vec)
    }
}
