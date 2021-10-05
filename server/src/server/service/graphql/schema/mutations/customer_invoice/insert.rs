use crate::server::service::graphql::schema::{
    mutations::error::{DatabaseError, ForeignKeyError, RecordAlreadyExistsError},
    types::invoice_query::{InvoiceLines, InvoiceNode, InvoiceStatus, InvoiceType},
};

use super::OtherPartyNotASupplierError;

use async_graphql::{Context, InputObject, Interface, SimpleObject, Union};

#[derive(InputObject)]
pub struct InsertCustomerInvoiceInput {
    other_party_id: String,
    status: Option<InvoiceStatus>,
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
#[graphql(
    field(name = "id", type = "String"),
    field(name = "description", type = "String")
)]
pub enum InsertCustomerInvoiceErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExistsError(RecordAlreadyExistsError),
    OtherPartyNotASupplierError(OtherPartyNotASupplierError),
    DatabaseError(DatabaseError),
}

pub async fn insert_customer_invoice(
    _ctx: &Context<'_>,
    _input: InsertCustomerInvoiceInput,
) -> InsertCustomerInvoiceResultUnion {
    // TODO: add insert logic.
    InsertCustomerInvoiceResultUnion::Ok(InsertCustomerInvoiceOk {
        invoice: InvoiceNode {
            id: "".to_string(),
            other_party_name: "".to_string(),
            other_party_id: "".to_string(),
            status: InvoiceStatus::Draft,
            invoice_type: InvoiceType::CustomerInvoice,
            invoice_number: 0,
            their_reference: None,
            comment: None,
            entry_datetime: "".to_string(),
            confirm_datetime: None,
            finalised_datetime: None,
            lines: InvoiceLines {
                invoice_id: "".to_string(),
            },
        },
    })
}
