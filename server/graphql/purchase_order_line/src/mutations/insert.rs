use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::PurchaseOrderLineRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::purchase_order_line::insert::{
    InsertPurchaseOrderLineError as ServiceError, InsertPurchaseOrderLineInput as ServiceInput,
};

#[derive(InputObject)]
#[graphql(name = "InsertPurchaseOrderLineInput")]
pub struct InsertInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            purchase_order_id,
            item_id,
        } = self;

        ServiceInput {
            id,
            purchase_order_id,
            item_id,
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertPurchaseOrderLineResponse")]
pub enum InsertResponse {
    Response(IdResponse),
}

pub fn insert_purchase_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    );

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user?.user_id)?;

    map_response(
        service_provider
            .purchase_order_line_service
            .insert_purchase_order_line(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PurchaseOrderLineRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(purchase_order) => Ok(InsertResponse::Response(IdResponse(purchase_order.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::ItemDoesNotExist
        | ServiceError::PurchaseOrderDoesNotExist
        | ServiceError::PurchaseOrderLineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
