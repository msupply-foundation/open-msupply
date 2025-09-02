use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::goods_received_row::GoodsReceivedRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::goods_received::insert::{
    InsertGoodsReceivedError as ServiceError, InsertGoodsReceivedInput as ServiceInput,
};

#[derive(InputObject)]
#[graphql(name = "InsertGoodsReceivedInput")]
pub struct InsertInput {
    pub id: String,
    pub purchase_order_id: String,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            purchase_order_id,
        } = self;
        ServiceInput {
            id,
            purchase_order_id,
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertGoodsReceivedResponse")]
pub enum InsertResponse {
    Response(IdResponse),
}

pub fn insert_goods_received(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .goods_received_service
            .insert_goods_received(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<GoodsReceivedRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(goods_received) => Ok(InsertResponse::Response(IdResponse(goods_received.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::PurchaseOrderDoesNotExist | ServiceError::GoodsReceivedAlreadyExists => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) | ServiceError::InternalError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
