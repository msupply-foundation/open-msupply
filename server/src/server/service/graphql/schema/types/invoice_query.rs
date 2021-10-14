use crate::{
    database::loader::{InvoiceLineQueryLoader, InvoiceLineStatsLoader},
    domain::{
        invoice::{Invoice, InvoiceFilter, InvoicePricing},
        invoice_line::InvoiceLine,
        DatetimeFilter, EqualFilter, SimpleStringFilter,
    },
    server::service::graphql::ContextExt,
};
use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use serde::Serialize;

use super::{
    Connector, ConnectorError, DatetimeFilterInput, EqualFilterInput, EqualFilterStringInput,
    InvoiceLinesResponse, NodeError, SimpleStringFilterInput, SortInput,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::domain::invoice::InvoiceSortField")]
pub enum InvoiceSortFieldInput {
    Type,
    Status,
    EntryDatetime,
    ConfirmDatetime,
    FinalisedDateTime,
}

pub type InvoiceSortInput = SortInput<InvoiceSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct InvoiceFilterInput {
    pub name_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInput<InvoiceNodeType>>,
    pub status: Option<EqualFilterInput<InvoiceNodeStatus>>,
    pub comment: Option<SimpleStringFilterInput>,
    pub their_reference: Option<EqualFilterStringInput>,
    pub entry_datetime: Option<DatetimeFilterInput>,
    pub confirm_datetime: Option<DatetimeFilterInput>,
    pub finalised_datetime: Option<DatetimeFilterInput>,
}

impl From<InvoiceFilterInput> for InvoiceFilter {
    fn from(f: InvoiceFilterInput) -> Self {
        InvoiceFilter {
            id: None,
            name_id: f.name_id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            r#type: f.r#type.map(EqualFilter::from),
            status: f.status.map(EqualFilter::from),
            comment: f.comment.map(SimpleStringFilter::from),
            their_reference: f.their_reference.map(EqualFilter::from),
            entry_datetime: f.entry_datetime.map(DatetimeFilter::from),
            confirm_datetime: f.confirm_datetime.map(DatetimeFilter::from),
            finalised_datetime: f.finalised_datetime.map(DatetimeFilter::from),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[graphql(remote = "crate::domain::invoice::InvoiceType")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InvoiceNodeType {
    CustomerInvoice,
    SupplierInvoice,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[graphql(remote = "crate::domain::invoice::InvoiceStatus")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum InvoiceNodeStatus {
    Draft,
    Confirmed,
    Finalised,
}

pub struct InvoiceNode {
    invoice: Invoice,
}

#[Object]
impl InvoiceNode {
    pub async fn id(&self) -> &str {
        &self.invoice.id
    }

    pub async fn other_party_name(&self) -> &str {
        &self.invoice.other_party_name
    }

    pub async fn other_party_id(&self) -> &str {
        &self.invoice.other_party_id
    }

    pub async fn r#type(&self) -> InvoiceNodeType {
        self.invoice.r#type.clone().into()
    }

    pub async fn status(&self) -> InvoiceNodeStatus {
        self.invoice.status.clone().into()
    }

    pub async fn invoice_number(&self) -> i32 {
        self.invoice.invoice_number
    }

    pub async fn their_reference(&self) -> &Option<String> {
        &self.invoice.their_reference
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.invoice.comment
    }

    pub async fn entry_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.invoice.entry_datetime, Utc)
    }

    pub async fn confirmed_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .confirm_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .finalised_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> InvoiceLinesResponse {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineQueryLoader>>();
        loader
            .load_one(self.invoice.id.to_string())
            .await
            .map(|result: Option<Vec<InvoiceLine>>| result.unwrap_or(Vec::new()))
            .into()
    }

    async fn pricing(&self, ctx: &Context<'_>) -> InvoicePriceResponse {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineStatsLoader>>();
        loader
            .load_one(self.invoice.id.to_string())
            .await
            // TODO report error
            .map(|result: Option<InvoicePricing>| {
                result.unwrap_or(InvoicePricing {
                    total_after_tax: 0.0,
                })
            })
            .into()
    }
}

type CurrentConnector = Connector<InvoiceNode>;

#[derive(Union)]
pub enum InvoicesResponse {
    Error(ConnectorError),
    Response(Connector<InvoiceNode>),
}

#[derive(Union)]
pub enum InvoiceResponse {
    Error(NodeError),
    Response(InvoiceNode),
}

impl<T, E> From<Result<T, E>> for InvoicesResponse
where
    CurrentConnector: From<T>,
    ConnectorError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => InvoicesResponse::Response(response.into()),
            Err(error) => InvoicesResponse::Error(error.into()),
        }
    }
}

impl<T, E> From<Result<T, E>> for InvoiceResponse
where
    InvoiceNode: From<T>,
    NodeError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => InvoiceResponse::Response(response.into()),
            Err(error) => InvoiceResponse::Error(error.into()),
        }
    }
}

impl From<Invoice> for InvoiceNode {
    fn from(invoice: Invoice) -> Self {
        InvoiceNode { invoice }
    }
}

// INVOICE LINE PRICING
pub struct InvoicePricingNode {
    invoice_pricing: InvoicePricing,
}

#[Object]
impl InvoicePricingNode {
    pub async fn total_after_tax(&self) -> f64 {
        self.invoice_pricing.total_after_tax
    }
}

#[derive(Union)]
pub enum InvoicePriceResponse {
    Error(NodeError),
    Response(InvoicePricingNode),
}

impl<T, E> From<Result<T, E>> for InvoicePriceResponse
where
    InvoicePricingNode: From<T>,
    NodeError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => InvoicePriceResponse::Response(response.into()),
            Err(error) => InvoicePriceResponse::Error(error.into()),
        }
    }
}

impl From<InvoicePricing> for InvoicePricingNode {
    fn from(invoice_pricing: InvoicePricing) -> Self {
        InvoicePricingNode { invoice_pricing }
    }
}
