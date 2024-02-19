use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;

#[derive(InputObject)]
#[graphql(name = "DeleteSupplierReturnInput")]
pub struct DeleteInput {
    pub ids: Vec<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteSupplierReturnError")]
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
#[graphql(name = "DeleteSupplierReturnResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(DeletedIdsResponse),
}

pub fn delete(_ctx: &Context<'_>, _store_id: &str, _input: DeleteInput) -> Result<DeleteResponse> {
    // let user = validate_auth(
    //     ctx,
    //     &ResourceAccessRequest {
    //         resource: Resource::MutateOutboundShipment,
    //         store_id: Some(store_id.to_string()),
    //     },
    // )?;

    // let service_provider = ctx.service_provider();
    // let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    // map_response(
    //     service_provider
    //         .invoice_service
    //         .delete_inbound_shipment(&service_context, input.to_domain()),
    // )
    Ok(DeleteResponse::Response(DeletedIdsResponse(vec![
        "deleted_id".to_string(),
    ])))
}

#[derive(Interface)]
#[graphql(name = "DeleteSupplierReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}
