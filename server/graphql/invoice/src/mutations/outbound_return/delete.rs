use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::outbound_return::delete::DeleteOutboundReturnError as ServiceError;

#[derive(InputObject)]
#[graphql(name = "DeleteOutboundReturnInput")]
pub struct DeleteInput {
    pub ids: Vec<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundReturnError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

pub struct DeletedIdsResponse(pub Vec<String>);
#[Object]
impl DeletedIdsResponse {
    pub async fn deleted_ids(&self) -> &Vec<String> {
        &self.0
    }
}

#[derive(Union)]
#[graphql(name = "DeleteOutboundReturnResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(DeletedIdsResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateOutboundReturn,
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .delete_outbound_returns(&service_context, input.ids),
    )
}

pub fn map_response(from: Result<Vec<String>, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(ids) => DeleteResponse::Response(DeletedIdsResponse(ids)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "DeleteOutboundReturnErrorInterface")]
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
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundReturn => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
