use async_graphql::*;
use graphql_core::generic_inputs::InboundShipmentType;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_types::types::InvoiceLineStatusType;
use repository::{InvoiceLineRowRepository, InvoiceLineStatus, StorageConnection};
use service::auth::{Resource, ResourceAccessRequest};

pub mod delete;
pub mod insert;
pub mod insert_from_internal_order;
pub mod update;

/// Check if updating inbound shipment lines requires the AuthoriseInboundShipmentExternal
/// permission. Only applies to external inbound shipments.
pub fn validate_line_edit_authorisation(
    ctx: &Context<'_>,
    store_id: &str,
    r#type: &InboundShipmentType,
    connection: &StorageConnection,
    line_updates: &[(String, Option<Option<InvoiceLineStatusType>>)],
) -> Result<()> {
    if *r#type != InboundShipmentType::InboundShipmentExternal {
        return Ok(());
    }

    let any_status_approve_or_reject = line_updates.iter().any(|(_, status)| {
        status.as_ref().is_some_and(|s| {
            matches!(
                s,
                Some(InvoiceLineStatusType::Passed) | Some(InvoiceLineStatusType::Rejected)
            )
        })
    });

    // TODO: come up with a better way to handle data based permissions. the graphql/service layer split makes it difficult to set permissions based on data
    let needs_authorise = any_status_approve_or_reject || {
        let repo = InvoiceLineRowRepository::new(connection);
        line_updates.iter().any(|(id, status)| {
            let is_changing_to_pending = status
                .as_ref()
                .is_some_and(|s| matches!(s, Some(InvoiceLineStatusType::Pending)));
            if is_changing_to_pending {
                return false;
            }
            repo.find_one_by_id(id)
                .ok()
                .flatten()
                .map_or(false, |l| l.status == Some(InvoiceLineStatus::Passed))
        })
    };

    if needs_authorise {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::AuthoriseInboundShipmentExternal,
                store_id: Some(store_id.to_string()),
            },
        )?;
    }

    Ok(())
}

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &str {
        "Batch is already reserved/issued"
    }
}

pub struct LineLinkedToTransferredInvoice;
#[Object]
impl LineLinkedToTransferredInvoice {
    pub async fn description(&self) -> &str {
        "Cannot delete line generated from a generated invoice"
    }
}
