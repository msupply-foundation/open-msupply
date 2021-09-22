use crate::{
    database::{
        loader::InvoiceLineStatsLoader,
        repository::{InvoiceQueryJoin, InvoiceQueryRepository},
        schema::{InvoiceLineStatsRow, InvoiceRowStatus, InvoiceRowType},
    },
    server::service::graphql::{schema::queries::pagination::Pagination, ContextExt},
};

use async_graphql::{dataloader::DataLoader, ComplexObject, Context, Enum, Object, SimpleObject};
use chrono::{DateTime, Utc};

#[derive(SimpleObject, PartialEq, Debug)]
pub struct InvoicesPricing {
    #[graphql(name = "totalAfterTax")]
    total_after_tax: f64,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum GraphQLInvoiceType {
    #[graphql(name = "CUSTOMER_INVOICE")]
    CustomerInvoice,
    #[graphql(name = "SUPPLIER_INVOICE")]
    SupplierInvoice,
}

impl From<InvoiceRowType> for GraphQLInvoiceType {
    fn from(row: InvoiceRowType) -> GraphQLInvoiceType {
        match row {
            InvoiceRowType::CustomerInvoice => GraphQLInvoiceType::CustomerInvoice,
            InvoiceRowType::SupplierInvoice => GraphQLInvoiceType::SupplierInvoice,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum GraphQLInvoiceStatus {
    #[graphql(name = "DRAFT")]
    Draft,
    #[graphql(name = "CONFIRMED")]
    Confirmed,
    #[graphql(name = "FINALISED")]
    Finalised,
}

impl From<InvoiceRowStatus> for GraphQLInvoiceStatus {
    fn from(row: InvoiceRowStatus) -> GraphQLInvoiceStatus {
        match row {
            InvoiceRowStatus::Draft => GraphQLInvoiceStatus::Draft,
            InvoiceRowStatus::Confirmed => GraphQLInvoiceStatus::Confirmed,
            InvoiceRowStatus::Finalised => GraphQLInvoiceStatus::Finalised,
        }
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(complex)]
#[graphql(name = "Invoice")]
pub struct InvoicesNode {
    id: String,
    #[graphql(name = "otherPartyName")]
    other_party_name: String,
    #[graphql(name = "otherPartyId")]
    other_party_id: String,
    status: GraphQLInvoiceStatus,
    #[graphql(name = "type")]
    invoice_type: GraphQLInvoiceType,
    #[graphql(name = "invoiceNumber")]
    invoice_number: i32,
    #[graphql(name = "theirReference")]
    their_reference: Option<String>,
    comment: Option<String>,
    #[graphql(name = "entryDatetime")]
    entry_datetime: String,
    #[graphql(name = "confirmDatetime")]
    confirm_datetime: Option<String>,
    #[graphql(name = "finalisedDatetime")]
    finalised_datetime: Option<String>,
}

#[ComplexObject]
impl InvoicesNode {
    async fn pricing(&self, ctx: &Context<'_>) -> InvoicesPricing {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineStatsLoader>>();

        let result = loader
            .load_one(self.id.to_string())
            .await
            .ok()
            .flatten()
            .map_or(
                InvoiceLineStatsRow {
                    invoice_id: self.id.to_string(),
                    total_after_tax: 0.0,
                },
                |v| v,
            );

        InvoicesPricing {
            total_after_tax: result.total_after_tax,
        }
    }
}

impl From<InvoiceQueryJoin> for InvoicesNode {
    fn from((invoice_row, name_row, _store_row): InvoiceQueryJoin) -> Self {
        // TODO return error if name is not present (None)?
        let (other_party_id, other_party_name) =
            name_row.map_or(("".to_string(), "".to_string()), |v| (v.id, v.name));

        InvoicesNode {
            id: invoice_row.id,
            other_party_name,
            other_party_id,
            status: GraphQLInvoiceStatus::from(invoice_row.status),
            invoice_type: GraphQLInvoiceType::from(invoice_row.r#type),
            invoice_number: invoice_row.invoice_number,
            their_reference: invoice_row.their_reference,
            comment: invoice_row.comment,
            entry_datetime: DateTime::<Utc>::from_utc(invoice_row.entry_datetime, Utc).to_rfc3339(),
            confirm_datetime: invoice_row
                .confirm_datetime
                .map(|v| DateTime::<Utc>::from_utc(v, Utc).to_rfc3339()),
            finalised_datetime: invoice_row
                .finalised_datetime
                .map(|v| DateTime::<Utc>::from_utc(v, Utc).to_rfc3339()),
        }
    }
}

pub struct InvoicesList {
    pub pagination: Option<Pagination>,
}

#[Object]
impl InvoicesList {
    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoicesNode> {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();

        repository
            .all(&self.pagination)
            .map_or(Vec::<InvoicesNode>::new(), |list| {
                list.into_iter().map(InvoicesNode::from).collect()
            })
    }
}
