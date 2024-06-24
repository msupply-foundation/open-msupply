use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::inbound_return::delete::DeleteInboundReturnError as ServiceError;

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundReturnError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInboundReturnResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, id: String) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .delete_inbound_return(&service_context, id),
    )
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::InvoiceDoesNotExist
        | ServiceError::CannotEditFinalised
        | ServiceError::NotAnInboundReturn
        | ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),

        ServiceError::DatabaseError(_) | ServiceError::LineDeleteError { .. } => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
