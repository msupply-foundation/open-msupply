use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible};
use graphql_types::types::InvoiceNode;
use repository::Invoice;

#[derive(InputObject)]
#[graphql(name = "OutboundReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub supplier_id: String, // to be other_party_id
    pub outbound_return_lines: Vec<OutboundReturnLineInput>,
}

#[derive(InputObject)]
pub struct OutboundReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs_to_return: f64,
    pub reason_id: String,
    pub comment: String,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundReturnResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(_ctx: &Context<'_>, _input: InsertInput) -> Result<InsertResponse> {
    Ok(InsertResponse::Response(InvoiceNode::from_domain(
        Invoice {
            ..Default::default()
        },
    )))
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundResponseErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}
