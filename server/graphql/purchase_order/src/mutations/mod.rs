pub mod add_from_master_list;
pub mod delete;
pub mod insert;
pub mod update;

use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_types::types::PurchaseOrderNodeStatus;
use repository::{PurchaseOrderRowRepository, PurchaseOrderStatus, StorageConnection};
use service::auth::{Resource, ResourceAccessRequest};
use service::preference::{AuthorisePurchaseOrder, Preference};
use service::purchase_order::add_to_purchase_order_from_master_list::AddToPurchaseOrderFromMasterListInput as ServiceInput;

/// Run the auth checks needed to update a purchase order.
///
/// Always requires `MutatePurchaseOrder`. Additionally requires:
/// - `AuthorisePurchaseOrder` when transitioning to Confirmed and the store
///   has the `purchase_order_must_be_authorised` preference enabled.
/// - `FinalisePurchaseOrder` when transitioning to Finalised.
///
/// Perms are only checked on actual transitions, so re-submitting the current
/// status doesn't fire a misleading auth error.
// TODO: same pattern as validate_line_edit_authorisation — the graphql/service
// split makes data-driven perms awkward. Splitting `updatePurchaseOrder` into
// per-transition mutations would remove this helper entirely.
pub fn validate_purchase_order_update_authorisation(
    ctx: &Context<'_>,
    store_id: &str,
    connection: &StorageConnection,
    purchase_order_id: &str,
    new_status: &Option<PurchaseOrderNodeStatus>,
) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let Some(new_status) = new_status.map(PurchaseOrderStatus::from) else {
        return Ok(());
    };

    let current_status = PurchaseOrderRowRepository::new(connection)
        .find_one_by_id(purchase_order_id)
        .map_err(StandardGraphqlError::from_repository_error)?
        .map(|p| p.status);

    if current_status.as_ref() == Some(&new_status) {
        return Ok(());
    }

    match new_status {
        PurchaseOrderStatus::Confirmed => {
            let auth_required = AuthorisePurchaseOrder
                .load(connection, Some(store_id.to_string()))
                .map_err(|e| StandardGraphqlError::InternalError(format!("{e:?}")).extend())?;
            if auth_required {
                validate_auth(
                    ctx,
                    &ResourceAccessRequest {
                        resource: Resource::AuthorisePurchaseOrder,
                        store_id: Some(store_id.to_string()),
                    },
                )?;
            }
        }
        PurchaseOrderStatus::Finalised => {
            validate_auth(
                ctx,
                &ResourceAccessRequest {
                    resource: Resource::FinalisePurchaseOrder,
                    store_id: Some(store_id.to_string()),
                },
            )?;
        }
        _ => {}
    }

    Ok(())
}

#[derive(async_graphql::InputObject)]
pub struct AddToPurchaseOrderFromMasterListInput {
    pub purchase_order_id: String,
    pub master_list_id: String,
}

impl AddToPurchaseOrderFromMasterListInput {
    pub fn to_domain(self) -> ServiceInput {
        let AddToPurchaseOrderFromMasterListInput {
            purchase_order_id,
            master_list_id,
        } = self;
        ServiceInput {
            purchase_order_id,
            master_list_id,
        }
    }
}
