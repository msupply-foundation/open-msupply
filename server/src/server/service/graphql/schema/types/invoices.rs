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
    total_after_tax: f64,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum InvoiceType {
    CustomerInvoice,
    SupplierInvoice,
}

impl From<InvoiceRowType> for InvoiceType {
    fn from(row: InvoiceRowType) -> InvoiceType {
        match row {
            InvoiceRowType::CustomerInvoice => InvoiceType::CustomerInvoice,
            InvoiceRowType::SupplierInvoice => InvoiceType::SupplierInvoice,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum InvoiceStatus {
    Draft,
    Confirmed,
    Finalised,
}

impl From<InvoiceRowStatus> for InvoiceStatus {
    fn from(row: InvoiceRowStatus) -> InvoiceStatus {
        match row {
            InvoiceRowStatus::Draft => InvoiceStatus::Draft,
            InvoiceRowStatus::Confirmed => InvoiceStatus::Confirmed,
            InvoiceRowStatus::Finalised => InvoiceStatus::Finalised,
        }
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(complex)]
#[graphql(name = "Invoice")]
pub struct InvoiceNode {
    id: String,
    other_party_name: String,
    other_party_id: String,
    status: InvoiceStatus,
    invoice_type: InvoiceType,
    invoice_number: i32,
    their_reference: Option<String>,
    comment: Option<String>,
    entry_datetime: String,
    confirm_datetime: Option<String>,
    finalised_datetime: Option<String>,
}

#[ComplexObject]
impl InvoiceNode {
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

impl From<InvoiceQueryJoin> for InvoiceNode {
    fn from((invoice_row, name_row, _store_row): InvoiceQueryJoin) -> Self {
        InvoiceNode {
            id: invoice_row.id,
            other_party_name: name_row.name,
            other_party_id: name_row.id,
            status: InvoiceStatus::from(invoice_row.status),
            invoice_type: InvoiceType::from(invoice_row.r#type),
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
    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoiceNode> {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();

        repository
            .all(&self.pagination)
            .map_or(Vec::<InvoiceNode>::new(), |list| {
                list.into_iter().map(InvoiceNode::from).collect()
            })
    }
}
