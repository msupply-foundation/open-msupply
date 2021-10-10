use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{ForeignKeyError, RecordDoesNotExist},
    types::{DatabaseError, ErrorWrapper, InvoiceNode, InvoiceNodeStatus},
};

use super::OtherPartyNotASuppier;

#[derive(InputObject)]
pub struct InsertSupplierInvoiceInput {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceNodeStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum InsertSupplierInvoiceResponse {
    Error(ErrorWrapper<InsertSupplierInvoiceErrorInterface>),
    Response(InvoiceNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordDoesNotExist),
    OtherPartyNotASuppier(OtherPartyNotASuppier),
}
