use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;

use crate::mutations::supplier_return::delete::DeletedIdsResponse;

#[derive(InputObject)]
#[graphql(name = "DeleteCustomerReturnInput")]
pub struct DeleteInput {
    pub ids: Vec<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteCustomerReturnError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteCustomerReturnResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(DeletedIdsResponse),
}

pub fn delete(_ctx: &Context<'_>, _store_id: &str, _input: DeleteInput) -> Result<DeleteResponse> {
    Ok(DeleteResponse::Response(DeletedIdsResponse(vec![
        "deleted_id".to_string(),
    ])))
}

#[derive(Interface)]
#[graphql(name = "DeleteCustomerReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}
