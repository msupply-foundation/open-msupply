use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::PurchaseOrderRow;
use service::purchase_order::insert::{
    InsertPurchaseOrderError as ServiceError, InsertPurchaseOrderInput as ServiceInput,
};

#[derive(InputObject)]
#[graphql(name = "InsertPurchaseOrderInput")]
pub struct InsertInput {
    pub id: String,
    pub supplier_id: String,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput { id, supplier_id } = self;

        ServiceInput { id, supplier_id }
    }
}

#[derive(Union)]
#[graphql(name = "InsertPurchaseOrderResponse")]
pub enum InsertResponse {
    Response(IdResponse),
}

pub fn insert_purchase_order(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    // TODO: add auth validation once permissions finalised
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;

    map_response(
        service_provider
            .purchase_order_service
            .insert_purchase_order(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PurchaseOrderRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(purchase_order) => Ok(InsertResponse::Response(IdResponse(purchase_order.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::SupplierDoesNotExist
        | ServiceError::PurchaseOrderAlreadyExists
        | ServiceError::NotASupplier => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
