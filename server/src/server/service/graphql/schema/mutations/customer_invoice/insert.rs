use crate::server::service::graphql::schema::{
    mutations::error::DatabaseError,
    types::{InvoiceNode, InvoiceNodeStatus},
};

use super::{
    OtherPartyCannotBeThisStoreError, OtherPartyIdMissingError, OtherPartyIdNotFoundError,
    OtherPartyNotACustomerOfThisStoreError,
};

use async_graphql::{InputObject, Interface, SimpleObject, Union};

#[derive(InputObject)]
pub struct InsertCustomerInvoiceInput {
    other_party_id: String,
    status: Option<InvoiceNodeStatus>,
    comment: Option<String>,
    their_reference: Option<String>,
}

#[derive(Union)]
pub enum InsertCustomerInvoiceResultUnion {
    Ok(InsertCustomerInvoiceOk),
    Error(InsertCustomerInvoiceError),
}

#[derive(SimpleObject)]
pub struct InsertCustomerInvoiceOk {
    invoice: InvoiceNode,
}

#[derive(SimpleObject)]
pub struct InsertCustomerInvoiceError {
    error: InsertCustomerInvoiceErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertCustomerInvoiceErrorInterface {
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyIdMissing(OtherPartyIdMissingError),
    OtherPartyIdNotFound(OtherPartyIdNotFoundError),
    OtherPartyNotACustomerOfThisStore(OtherPartyNotACustomerOfThisStoreError),
    DatabaseError(DatabaseError),
}
