use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_purchase_order::mutations::{delete, insert, update};
use graphql_purchase_order_line::mutations::{delete as delete_line, insert as insert_line, update as update_line};
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::purchase_order::batch::*;

use crate::{to_standard_error, VecOrNone};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertPurchaseOrderResponseWithId",
    params(insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdatePurchaseOrderResponseWithId",
    params(update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeletePurchaseOrderResponseWithId",
    params(delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertPurchaseOrderLineResponseWithId",
    params(insert_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdatePurchaseOrderLineResponseWithId",
    params(update_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeletePurchaseOrderLineResponseWithId",
    params(delete_line::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type ServiceInput = BatchPurchaseOrder;
type ServiceResult = BatchPurchaseOrderResult;

type InsertPurchaseOrdersResponse = Option<Vec<MutationWithId<insert::InsertResponse>>>;
type UpdatePurchaseOrdersResponse = Option<Vec<MutationWithId<update::UpdateResponse>>>;
type DeletePurchaseOrdersResponse = Option<Vec<MutationWithId<delete::DeleteResponse>>>;

type InsertPurchaseOrderLinesResponse = Option<Vec<MutationWithId<insert_line::InsertResponse>>>;
type UpdatePurchaseOrderLinesResponse = Option<Vec<MutationWithId<update_line::UpdateResponse>>>;
type DeletePurchaseOrderLinesResponse = Option<Vec<MutationWithId<delete_line::DeleteResponse>>>;

#[derive(SimpleObject)]
pub struct BatchResponse {
    pub insert_purchase_orders: InsertPurchaseOrdersResponse,
    pub update_purchase_orders: UpdatePurchaseOrdersResponse,
    pub delete_purchase_orders: DeletePurchaseOrdersResponse,
    pub insert_purchase_order_lines: InsertPurchaseOrderLinesResponse,
    pub update_purchase_order_lines: UpdatePurchaseOrderLinesResponse,
    pub delete_purchase_order_lines: DeletePurchaseOrderLinesResponse,
}

#[derive(InputObject)]
pub struct BatchInput {
    pub insert_purchase_orders: Option<Vec<insert::InsertInput>>,
    pub update_purchase_orders: Option<Vec<update::UpdateInput>>,
    pub delete_purchase_orders: Option<Vec<delete::DeleteInput>>,
    pub insert_purchase_order_lines: Option<Vec<insert_line::InsertInput>>,
    pub update_purchase_order_lines: Option<Vec<update_line::UpdateInput>>,
    pub delete_purchase_order_lines: Option<Vec<delete_line::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchInput,
) -> Result<BatchResponse> {
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
            insert_purchase_orders,
            update_purchase_orders,
            delete_purchase_orders,
            insert_purchase_order_lines,
            update_purchase_order_lines,
            delete_purchase_order_lines,
            continue_on_error,
        } = self;

        ServiceInput {
            insert_purchase_order: insert_purchase_orders
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_purchase_order: update_purchase_orders
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_purchase_order: delete_purchase_orders
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_purchase_order_line: insert_purchase_order_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_purchase_order_line: update_purchase_order_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_purchase_order_line: delete_purchase_order_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_purchase_order,
            insert_purchase_order_line,
            update_purchase_order_line,
            delete_purchase_order_line,
            update_purchase_order,
            delete_purchase_order,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        Ok(BatchResponse {
            insert_purchase_orders: map_insert_purchase_orders(insert_purchase_order)?,
            update_purchase_orders: map_update_purchase_orders(update_purchase_order)?,
            delete_purchase_orders: map_delete_purchase_orders(delete_purchase_order)?,
            insert_purchase_order_lines: map_insert_purchase_order_lines(insert_purchase_order_line)?,
            update_purchase_order_lines: map_update_purchase_order_lines(update_purchase_order_line)?,
            delete_purchase_order_lines: map_delete_purchase_order_lines(delete_purchase_order_line)?,
        })
    }
}

fn map_insert_purchase_orders(
    responses: InsertPurchaseOrdersResult,
) -> Result<InsertPurchaseOrdersResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(purchase_order) => insert::InsertResponse::Response(
                graphql_types::types::IdResponse(purchase_order.id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_purchase_orders(
    responses: UpdatePurchaseOrdersResult,
) -> Result<UpdatePurchaseOrdersResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(purchase_order) => update::UpdateResponse::Response(
                graphql_types::types::IdResponse(purchase_order.id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_purchase_orders(
    responses: DeletePurchaseOrdersResult,
) -> Result<DeletePurchaseOrdersResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(id) => delete::DeleteResponse::Response(
                graphql_types::types::DeleteResponse(id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_purchase_order_lines(
    responses: InsertPurchaseOrderLinesResult,
) -> Result<InsertPurchaseOrderLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(line) => insert_line::InsertResponse::Response(
                graphql_types::types::IdResponse(line.id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_purchase_order_lines(
    responses: UpdatePurchaseOrderLinesResult,
) -> Result<UpdatePurchaseOrderLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(line) => update_line::UpdateResponse::Response(
                graphql_types::types::IdResponse(line.purchase_order_line_row.id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_purchase_order_lines(
    responses: DeletePurchaseOrderLinesResult,
) -> Result<DeletePurchaseOrderLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match response.result {
            Ok(id) => delete_line::DeleteResponse::Response(
                graphql_types::types::DeleteResponse(id),
            ),
            Err(error) => return Err(to_standard_error(response.input, format!("{:#?}", error).into())),
        };
        result.push(MutationWithId {
            id: response.input.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}
