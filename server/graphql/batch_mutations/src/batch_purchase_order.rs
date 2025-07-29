use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_purchase_order_line::mutations::insert;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::purchase_order::batch::BatchPurchaseOrder;
use service::purchase_order::batch::BatchPurchaseOrderResult;
use service::purchase_order::batch::InsertLinesResult;

use crate::to_standard_error;
use crate::VecOrNone;

type ServiceInput = BatchPurchaseOrder;
type ServiceResult = BatchPurchaseOrderResult;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertPurchaseOrderLineResponseWithId",
    params(insert::InsertResponse)
))]

pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type InsertPurchaseOrderLineResponse = Option<Vec<MutationWithId<insert::InsertResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchPurchaseOrderResponse")]
pub struct BatchResponse {
    insert_purchase_order_lines: InsertPurchaseOrderLineResponse,
    // TODO add mutate and delete structure
}

#[derive(InputObject)]
#[graphql(name = "BatchPurchaseOrderInput")]
pub struct BatchInput {
    pub insert_purchase_order_lines: Option<Vec<insert::InsertInput>>,
    // TODO add other mutate
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .purchase_order_service
        .batch_purchase_order(&service_context, input.to_domain())?;

    BatchResponse::from_domain(response)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_purchase_order_lines,
            continue_on_error,
        } = self;
        ServiceInput {
            insert_lines: insert_purchase_order_lines
                .map(|lines| lines.into_iter().map(|line| line.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_line,
            // TODO add other line mutations
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_purchase_order_lines: map_insert_lines(insert_line)?,
        };

        Ok(result)
    }
}

fn map_insert_lines(responses: InsertLinesResult) -> Result<InsertPurchaseOrderLineResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match graphql_purchase_order_line::mutations::insert::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}
