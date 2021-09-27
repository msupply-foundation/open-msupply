use crate::{
    database::{
        loader::InvoiceLineStatsLoader,
        repository::{
            InvoiceLineQueryJoin, InvoiceLineQueryRepository, InvoiceLineStats, InvoiceQueryJoin,
        },
        schema::{InvoiceRowStatus, InvoiceRowType},
    },
    server::service::graphql::ContextExt,
};

use async_graphql::{dataloader::DataLoader, ComplexObject, Context, Enum, Object, SimpleObject};
use chrono::{DateTime, Utc};

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
pub struct InvoiceLinePricing {
    /// total for all invoice lines
    total_after_tax: f64,
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(complex)]
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
    lines: InvoiceLines,
}

#[ComplexObject]
impl InvoiceNode {
    async fn pricing(&self, ctx: &Context<'_>) -> InvoiceLinePricing {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineStatsLoader>>();

        let result = loader
            .load_one(self.id.to_string())
            .await
            .ok()
            .flatten()
            .map_or(
                InvoiceLineStats {
                    invoice_id: self.id.to_string(),
                    total_after_tax: 0.0,
                },
                |v| v,
            );

        InvoiceLinePricing {
            total_after_tax: result.total_after_tax,
        }
    }
}

impl From<InvoiceQueryJoin> for InvoiceNode {
    fn from((invoice_row, name_row, _store_row): InvoiceQueryJoin) -> Self {
        InvoiceNode {
            id: invoice_row.id.to_owned(),
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
            lines: InvoiceLines {
                invoice_id: invoice_row.id,
            },
        }
    }
}

#[derive(PartialEq, Debug)]
struct InvoiceLines {
    invoice_id: String,
}

#[Object]
impl InvoiceLines {
    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoiceLineNode> {
        let repository = ctx.get_repository::<InvoiceLineQueryRepository>();
        let lines = repository
            .find_many_by_invoice_id(self.invoice_id.as_str())
            .await
            .ok()
            .map_or(Vec::new(), |v| v);

        lines.into_iter().map(InvoiceLineNode::from).collect()
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "InvoiceQueryLineNode")]
pub struct InvoiceLineNode {
    id: String,
    item_id: String,
    item_name: String,
    item_code: String,
    pack_size: i32,
    number_of_packs: i32,
    cost_price_per_pack: f64,
    sell_price_per_pack: f64,
    batch: Option<String>,
    expiry_date: Option<String>,
    stock_line: StockLine,
}

impl From<InvoiceLineQueryJoin> for InvoiceLineNode {
    fn from((invoice_line, item, stock_line): InvoiceLineQueryJoin) -> Self {
        // TODO: is that correct:
        let invoice_number_of_packs = invoice_line.available_number_of_packs;
        InvoiceLineNode {
            id: invoice_line.id,
            item_id: item.id,
            item_name: item.name,
            item_code: item.code,
            pack_size: invoice_line.pack_size,
            number_of_packs: invoice_number_of_packs,
            cost_price_per_pack: invoice_line.cost_price_per_pack,
            sell_price_per_pack: invoice_line.sell_price_per_pack,
            batch: invoice_line.batch,
            expiry_date: invoice_line.expiry_date,
            stock_line: StockLine {
                available_number_of_packs: stock_line.available_number_of_packs
                    + invoice_number_of_packs,
            },
        }
    }
}

#[derive(SimpleObject, PartialEq, Debug)]
pub struct StockLine {
    /// number of pack available for a batch ("includes" numberOfPacks in this line)
    available_number_of_packs: i32,
}
