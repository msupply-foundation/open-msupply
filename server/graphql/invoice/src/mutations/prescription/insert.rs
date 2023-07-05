use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotAPatient, OtherPartyNotVisible};
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::prescription::{
    InsertPrescription as ServiceInput, InsertPrescriptionError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertPrescriptionInput")]
pub struct InsertInput {
    pub id: String,
    pub patient_id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertPrescriptionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertPrescriptionResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .insert_prescription(&service_context, input.to_domain()),
    )
}

#[derive(Interface)]
#[graphql(name = "InsertPrescriptionErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotAPatient(OtherPartyNotAPatient),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput { id, patient_id } = self;

        ServiceInput { id, patient_id }
    }
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotAPatient => {
            return Ok(InsertErrorInterface::OtherPartyNotAPatient(
                OtherPartyNotAPatient,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::InvoiceAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
