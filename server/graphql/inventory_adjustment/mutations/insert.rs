use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::inventory_adjustment,
};

#[derive(InputObject)]
#[graphql(name = "CreateInventoryAdjustmentInput")]
pub struct CreateInventoryAdjustmentInput {
    pub stock_line_id: String,
    pub new_number_of_packs: f64,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Union)]
#[graphql(name = "CreateInventoryAdjustmentResponse")]
pub enum InsertResponse {
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
            resource: Resource::MutateInventoryAdjustment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let _service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .insert_inventory_adjustment(ctx, input.to_domain());

    let result = match result {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(err) => InsertResponse::Error(InsertError {
            error: map_error(err)?,
        }),
    };

    Ok(result)
}
