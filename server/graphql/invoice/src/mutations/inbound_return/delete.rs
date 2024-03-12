use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

#[derive(InputObject)]
#[graphql(name = "DeleteInboundReturnInput")]
pub struct DeleteInput {
    // TODO: convert to accept singular ID
    pub ids: Vec<String>,
}

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

pub fn delete(_ctx: &Context<'_>, _store_id: &str, _input: DeleteInput) -> Result<DeleteResponse> {
    Ok(DeleteResponse::Response(GenericDeleteResponse(
        "deleted_id".to_string(),
    )))
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}
