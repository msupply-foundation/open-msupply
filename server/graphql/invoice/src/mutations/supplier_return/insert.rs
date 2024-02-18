use async_graphql::*;

use graphql_core::simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible};
use graphql_types::types::InvoiceNode;
use repository::Invoice;

#[derive(InputObject)]
#[graphql(name = "SupplierReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub supplier_id: String, // to be other_party_id
    pub supplier_return_lines: Vec<SupplierReturnLineInput>,
}

#[derive(InputObject)]
pub struct SupplierReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs_to_return: f64,
    pub reason_id: String,
    pub comment: String,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertSupplierReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertSupplierReturnResponse")]
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
#[graphql(name = "InsertSupplierResponseErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}
