use crate::mutations::AddToPurchaseOrderFromMasterListInput;
use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        CannotEditPurchaseOrder, MasterListNotFoundForThisStore, RecordNotFound,
    },
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use graphql_types::types::PurchaseOrderLineConnector;
use service::{
    auth::{Resource, ResourceAccessRequest},
    purchase_order::add_to_purchase_order_from_master_list::AddToPurchaseOrderFromMasterListError as ServiceError,
};

#[derive(Interface)]
#[graphql(name = "AddToPurchaseOrderFromMasterListErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    MasterListNotFoundForThisStore(MasterListNotFoundForThisStore),
    CannotEditPurchaseOrder(CannotEditPurchaseOrder),
}

#[derive(SimpleObject)]
#[graphql(name = "AddToPurchaseOrderFromMasterListError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "AddToPurchaseOrderFromMasterListResponse")]
pub enum AddFromMasterListResponse {
    Error(DeleteError),
    Response(PurchaseOrderLineConnector),
}

pub fn add_to_purchase_order_from_master_list(
    ctx: &Context<'_>,
    store_id: &str,
    input: AddToPurchaseOrderFromMasterListInput,
) -> Result<AddFromMasterListResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // TODO update to mutate purchase order
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = match service_provider
        .purchase_order_service
        .add_to_purchase_order_from_master_list(&service_context, input.to_domain())
    {
        Ok(purchase_order_lines) => AddFromMasterListResponse::Response(
            PurchaseOrderLineConnector::from_vec(purchase_order_lines),
        ),
        Err(error) => AddFromMasterListResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::PurchaseOrderDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditPurchaseOrder => {
            return Ok(DeleteErrorInterface::CannotEditPurchaseOrder(
                CannotEditPurchaseOrder {},
            ))
        }
        ServiceError::MasterListNotFoundForThisStore => {
            return Ok(DeleteErrorInterface::MasterListNotFoundForThisStore(
                MasterListNotFoundForThisStore {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStorePurchaseOrder => BadUserInput(formatted_error),
        ServiceError::NotAPurchaseOrder => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
