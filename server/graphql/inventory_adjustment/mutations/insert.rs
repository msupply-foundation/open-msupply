use async_graphql::*;
use graphql_core::{
    simple_generic_errors::CannotHaveFractionalPack, standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::{generic_errors::StockLineReducedBelowZero, types::InvoiceNode};
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum AdjustmentDirectionInput {
    Addition,
    Reduction,
}

#[derive(InputObject)]
#[graphql(name = "CreateInventoryAdjustmentInput")]
pub struct CreateInventoryAdjustmentInput {
    pub stock_line_id: String,
    pub new_number_of_packs: f64,
    pub direction: AdjustmentDirectionInput,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "CreateInventoryAdjustmentErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum CreateErrorInterface {
    StockLineReducedBelowZero(StockLineReducedBelowZero),
    CannotHaveFractionalPack(CannotHaveFractionalPack),
}

#[derive(SimpleObject)]
#[graphql(name = "CreateInventoryAdjustmentError")]
pub struct InsertError {
    pub error: CreateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "CreateInventoryAdjustmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn create_inventory_adjustment(
    ctx: &Context<'_>,
    store_id: &str,
    _input: CreateInventoryAdjustmentInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // TODO map Permissions::EnterInventoryAdjustments
            resource: Resource::CreateRepack,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let _service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    Ok(InsertResponse::Response(InvoiceNode::from_domain(
        Invoice {
            ..Default::default()
        },
    )))
}
