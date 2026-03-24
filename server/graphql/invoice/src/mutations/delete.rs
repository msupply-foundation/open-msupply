use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::{
    generic_errors::CannotDeleteInvoiceWithLines, types::DeleteResponse as GenericDeleteResponse,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::{DeleteInvoiceError as ServiceError, DeleteInvoiceType},
};

use crate::invoice_queries::InvoiceTypeInput;

#[derive(InputObject)]
#[graphql(name = "DeleteInvoiceInput")]
pub struct DeleteInvoiceInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInvoiceError")]
pub struct DeleteInvoiceError {
    pub error: DeleteInvoiceErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInvoiceLineResponse")]
pub enum DeleteInvoiceLineResponse {
    Error(DeleteInvoiceError),
    Response(GenericDeleteResponse),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInvoicesResponse")]
pub struct DeleteInvoicesResponse {
    pub delete_invoices: Vec<MutationWithIdResponse>,
}

#[derive(SimpleObject)]
pub struct MutationWithIdResponse {
    pub id: String,
    pub response: DeleteInvoiceLineResponse,
}

impl InvoiceTypeInput {
    pub fn mutation_resource(&self) -> Resource {
        match self {
            InvoiceTypeInput::OutboundShipment => Resource::MutateOutboundShipment,
            InvoiceTypeInput::InboundShipment => Resource::MutateInboundShipment,
            InvoiceTypeInput::InboundShipmentExternal => Resource::MutateInboundShipmentExternal,
            InvoiceTypeInput::Prescription => Resource::MutatePrescription,
            InvoiceTypeInput::SupplierReturn => Resource::MutateSupplierReturn,
            InvoiceTypeInput::CustomerReturn => Resource::MutateCustomerReturn,
        }
    }

    pub fn to_delete_invoice_type(&self) -> DeleteInvoiceType {
        match self {
            InvoiceTypeInput::OutboundShipment => DeleteInvoiceType::OutboundShipment,
            InvoiceTypeInput::InboundShipment => DeleteInvoiceType::InboundShipment,
            InvoiceTypeInput::InboundShipmentExternal => DeleteInvoiceType::InboundShipmentExternal,
            InvoiceTypeInput::Prescription => DeleteInvoiceType::Prescription,
            InvoiceTypeInput::SupplierReturn => DeleteInvoiceType::SupplierReturn,
            InvoiceTypeInput::CustomerReturn => DeleteInvoiceType::CustomerReturn,
        }
    }
}

pub fn delete_invoices(
    ctx: &Context<'_>,
    store_id: &str,
    ids: Vec<DeleteInvoiceInput>,
    r#type: Vec<InvoiceTypeInput>,
) -> Result<DeleteInvoicesResponse> {
    // Validate auth for each requested type
    let mut user = None;
    for t in &r#type {
        user = Some(validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: t.mutation_resource(),
                store_id: Some(store_id.to_string()),
            },
        )?);
    }
    let user = user.ok_or(
        StandardGraphqlError::BadUserInput("At least one type must be specified".to_string())
            .extend(),
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let allowed_types: Vec<DeleteInvoiceType> =
        r#type.iter().map(|t| t.to_delete_invoice_type()).collect();

    let results: Vec<MutationWithIdResponse> = ids
        .into_iter()
        .map(|input| {
            let id = input.id.clone();
            let result = service_provider.invoice_service.delete_invoice(
                &service_context,
                input.id,
                &allowed_types,
            );
            MutationWithIdResponse {
                id,
                response: map_response(result),
            }
        })
        .collect();

    Ok(DeleteInvoicesResponse {
        delete_invoices: results,
    })
}

/// Maps a delete result to a structured response (for the deleteInvoices mutation).
/// All errors become structured DeleteInvoiceError variants.
fn map_response(from: Result<String, ServiceError>) -> DeleteInvoiceLineResponse {
    match from {
        Ok(id) => DeleteInvoiceLineResponse::Response(GenericDeleteResponse(id)),
        Err(error) => match map_error(error) {
            Ok(error_interface) => DeleteInvoiceLineResponse::Error(DeleteInvoiceError {
                error: error_interface,
            }),
            Err(_) => DeleteInvoiceLineResponse::Error(DeleteInvoiceError {
                error: DeleteInvoiceErrorInterface::RecordNotFound(RecordNotFound {}),
            }),
        },
    }
}

/// Maps a delete result for use in batch mutation responses.
/// Standard GraphQL errors (e.g. InvoiceTypeNotSupported) propagate as Err.
pub fn map_batch_response(from: Result<String, ServiceError>) -> Result<DeleteInvoiceLineResponse> {
    match from {
        Ok(id) => Ok(DeleteInvoiceLineResponse::Response(GenericDeleteResponse(id))),
        Err(error) => match map_error(error) {
            Ok(error_interface) => Ok(DeleteInvoiceLineResponse::Error(DeleteInvoiceError {
                error: error_interface,
            })),
            Err(standard_error) => Err(standard_error),
        },
    }
}

#[derive(Interface)]
#[graphql(name = "DeleteInvoiceErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum DeleteInvoiceErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

fn map_error(error: ServiceError) -> Result<DeleteInvoiceErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteInvoiceErrorInterface::RecordNotFound(
                RecordNotFound {},
            ))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteInvoiceErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::NotThisStoreInvoice | ServiceError::InvoiceTypeNotSupported => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) | ServiceError::LineDeleteError { .. } => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
