use async_graphql::*;
use graphql_core::generic_inputs::InboundShipmentType;
use graphql_core::standard_graphql_error::validate_auth;
use service::auth::{Resource, ResourceAccessRequest};

pub mod delete;
pub mod insert;
pub mod update;

pub mod add_from_master_list;
pub use add_from_master_list::*;

/// Check if finalising (verifying) an external inbound shipment requires the
/// VerifyInboundShipmentExternal permission.
pub fn validate_shipment_verify_authorisation(
    ctx: &Context<'_>,
    store_id: &str,
    r#type: &InboundShipmentType,
    status: &Option<update::UpdateInboundShipmentStatusInput>,
) -> Result<()> {
    if !matches!(
        status,
        Some(update::UpdateInboundShipmentStatusInput::Verified)
    ) {
        return Ok(());
    }

    let resource = match r#type {
        InboundShipmentType::InboundShipmentExternal => Resource::VerifyInboundShipmentExternal,
        InboundShipmentType::InboundShipment => Resource::VerifyInboundShipment,
    };

    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource,
            store_id: Some(store_id.to_string()),
        },
    )?;

    Ok(())
}

pub struct CannotReceiveWithPendingLines;
#[Object]
impl CannotReceiveWithPendingLines {
    pub async fn description(&self) -> &str {
        "Cannot mark invoice as received while it has pending lines."
    }
}
