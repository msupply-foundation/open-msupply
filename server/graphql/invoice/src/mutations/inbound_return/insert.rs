use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible};
use graphql_types::types::InvoiceNode;
use repository::Invoice;

#[derive(InputObject)]
#[graphql(name = "InboundReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub customer_id: String, // to be other_party_id
    pub inbound_return_lines: Vec<InboundReturnLineInput>,
}

#[derive(InputObject)]
pub struct InboundReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs_returned: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInboundReturnResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(_ctx: &Context<'_>, _store_id: &str, _input: InsertInput) -> Result<InsertResponse> {
    Ok(InsertResponse::Response(InvoiceNode::from_domain(
        Invoice {
            ..Default::default()
        },
    )))
}

#[derive(Interface)]
#[graphql(name = "InsertInboundReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotACustomer(OtherPartyNotACustomer),
}
