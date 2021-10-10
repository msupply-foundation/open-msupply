use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotChangeInvoiceBackToDraft, CannotEditFinalisedInvoice, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotASupplierInvoice, RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper, InvoiceNode, InvoiceNodeStatus},
};

use super::OtherPartyNotASuppier;

#[derive(InputObject)]
pub struct UpdateSupplierInvoiceInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceNodeStatus>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum UpdateSupplierInvoiceResponse {
    Error(ErrorWrapper<UpdateSupplierInvoiceErrorInterface>),
    Response(InvoiceNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExist(RecordDoesNotExist),
    OtherPartyNotASuppier(OtherPartyNotASuppier),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft),
}
