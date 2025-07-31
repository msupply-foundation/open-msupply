use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;

use service::auth::{Resource, ResourceAccessRequest};
use service::purchase_order_line::insert::InsertPurchaseOrderLineFromCSVInput as ServiceInput;

use crate::mutations::insert::{map_response, InsertResponse};

#[derive(InputObject)]
#[graphql(name = "InsertPurchaseOrderLineFromCSVInput")]
pub struct InsertFromCSVInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_code: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
}

impl InsertFromCSVInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertFromCSVInput {
            id,
            purchase_order_id,
            item_code,
            requested_pack_size,
            requested_number_of_units,
        } = self;

        ServiceInput {
            id,
            purchase_order_id,
            item_code,
            requested_pack_size,
            requested_number_of_units,
        }
    }
}

pub fn insert_purchase_order_line_from_csv(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertFromCSVInput,
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
            .insert_purchase_order_line_from_csv(&service_context, input.to_domain()),
    )
}
