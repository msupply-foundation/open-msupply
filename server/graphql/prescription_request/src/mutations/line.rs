use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_request_line::delete::DeletePrescriptionRequestLineError;
use service::prescription_request_line::upsert::{
    UpsertPrescriptionRequestLine as UpsertServiceInput,
    UpsertPrescriptionRequestLineError as UpsertServiceError,
};

use crate::types::PrescriptionRequestLineNode;

#[derive(InputObject)]
#[graphql(name = "UpsertPrescriptionRequestLineInput")]
pub struct UpsertLineInput {
    pub id: String,
    pub prescription_request_id: String,
    pub item_id: String,
    /// Prescribed quantity, in units
    pub number_of_units: f64,
    /// Directions
    pub note: Option<String>,
}

impl UpsertLineInput {
    pub fn to_domain(self) -> UpsertServiceInput {
        let UpsertLineInput {
            id,
            prescription_request_id,
            item_id,
            number_of_units,
            note,
        } = self;
        UpsertServiceInput {
            id,
            prescription_request_id,
            item_id,
            number_of_units,
            note,
        }
    }
}

#[derive(Union)]
#[graphql(name = "UpsertPrescriptionRequestLineResponse")]
pub enum UpsertLineResponse {
    Response(PrescriptionRequestLineNode),
}

pub fn upsert_prescription_request_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpsertLineInput,
) -> Result<UpsertLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescriptionRequest,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .prescription_request_line_service
        .upsert_prescription_request_line(&service_context, store_id, input.to_domain())
    {
        Ok(line) => Ok(UpsertLineResponse::Response(
            PrescriptionRequestLineNode::from_domain(line),
        )),
        Err(error) => Err(map_upsert_error(error)),
    }
}

fn map_upsert_error(error: UpsertServiceError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        UpsertServiceError::PrescriptionRequestDoesNotExist
        | UpsertServiceError::NotThisStorePrescriptionRequest
        | UpsertServiceError::NotEditable
        | UpsertServiceError::LineBelongsToAnotherPrescriptionRequest
        | UpsertServiceError::ItemDoesNotExist
        | UpsertServiceError::NotAStockItem
        | UpsertServiceError::InvalidQuantity => BadUserInput(formatted_error),
        UpsertServiceError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}

#[derive(Union)]
#[graphql(name = "DeletePrescriptionRequestLineResponse")]
pub enum DeleteLineResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_prescription_request_line(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescriptionRequest,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_delete_line_response(
        service_provider
            .prescription_request_line_service
            .delete_prescription_request_line(&service_context, store_id, id),
    )
}

pub fn map_delete_line_response(
    from: Result<String, DeletePrescriptionRequestLineError>,
) -> Result<DeleteLineResponse> {
    match from {
        Ok(id) => Ok(DeleteLineResponse::Response(GenericDeleteResponse(id))),
        Err(error) => Err(map_delete_error(error)),
    }
}

fn map_delete_error(error: DeletePrescriptionRequestLineError) -> async_graphql::Error {
    let formatted_error = format!("{error:#?}");
    match error {
        DeletePrescriptionRequestLineError::LineDoesNotExist
        | DeletePrescriptionRequestLineError::NotThisStorePrescriptionRequest
        | DeletePrescriptionRequestLineError::NotEditable => BadUserInput(formatted_error),
        DeletePrescriptionRequestLineError::DatabaseError(_) => InternalError(formatted_error),
    }
    .extend()
}
