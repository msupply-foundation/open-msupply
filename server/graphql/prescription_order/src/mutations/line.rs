use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_order_line::delete::DeletePrescriptionOrderLineError;
use service::prescription_order_line::upsert::{
    UpsertPrescriptionOrderLine as UpsertServiceInput,
    UpsertPrescriptionOrderLineError as UpsertServiceError,
};

use crate::types::PrescriptionOrderLineNode;

#[derive(InputObject)]
#[graphql(name = "UpsertPrescriptionOrderLineInput")]
pub struct UpsertLineInput {
    pub id: String,
    pub prescription_order_id: String,
    pub item_id: String,
    /// Prescribed quantity in units
    pub quantity: f64,
    /// Directions
    pub note: Option<String>,
}

impl UpsertLineInput {
    pub fn to_domain(self) -> UpsertServiceInput {
        let UpsertLineInput {
            id,
            prescription_order_id,
            item_id,
            quantity,
            note,
        } = self;
        UpsertServiceInput {
            id,
            prescription_order_id,
            item_id,
            quantity,
            note,
        }
    }
}

#[derive(Union)]
#[graphql(name = "UpsertPrescriptionOrderLineResponse")]
pub enum UpsertLineResponse {
    Response(PrescriptionOrderLineNode),
}

pub fn upsert_prescription_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpsertLineInput,
) -> Result<UpsertLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .prescription_order_line_service
        .upsert_prescription_order_line(&service_context, store_id, input.to_domain())
    {
        Ok(line) => Ok(UpsertLineResponse::Response(
            PrescriptionOrderLineNode::from_domain(line),
        )),
        Err(error) => Err(map_upsert_error(error)),
    }
}

fn map_upsert_error(error: UpsertServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        UpsertServiceError::PrescriptionOrderDoesNotExist
        | UpsertServiceError::NotThisStorePrescriptionOrder
        | UpsertServiceError::NotEditable
        | UpsertServiceError::LineBelongsToAnotherPrescriptionOrder
        | UpsertServiceError::ItemDoesNotExist
        | UpsertServiceError::NotAStockItem
        | UpsertServiceError::InvalidQuantity => BadUserInput(formatted_error),
        UpsertServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}

#[derive(Union)]
#[graphql(name = "DeletePrescriptionOrderLineResponse")]
pub enum DeleteLineResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_prescription_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .prescription_order_line_service
        .delete_prescription_order_line(&service_context, store_id, id)
    {
        Ok(id) => Ok(DeleteLineResponse::Response(GenericDeleteResponse(id))),
        Err(error) => Err(map_delete_error(error)),
    }
}

fn map_delete_error(error: DeletePrescriptionOrderLineError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        DeletePrescriptionOrderLineError::LineDoesNotExist
        | DeletePrescriptionOrderLineError::NotThisStorePrescriptionOrder
        | DeletePrescriptionOrderLineError::NotEditable => BadUserInput(formatted_error),
        DeletePrescriptionOrderLineError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
