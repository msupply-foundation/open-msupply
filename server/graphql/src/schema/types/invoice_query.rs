use crate::{
    loader::{InvoiceLineQueryLoader, InvoiceLineStatsLoader, NameByIdLoader},
    ContextExt,
};
use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use domain::{
    invoice::{Invoice, InvoiceFilter, InvoicePricing},
    DatetimeFilter, EqualFilter, SimpleStringFilter,
};
use repository::StorageConnectionManager;
use serde::Serialize;
use service::invoice::get_invoice;

use super::{
    Connector, ConnectorError, DatetimeFilterInput, EqualFilterInput, EqualFilterNumberInput,
    EqualFilterStringInput, ErrorWrapper, InvoiceLinesResponse, NameResponse, NodeError,
    NodeErrorInterface, SimpleStringFilterInput, SortInput,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "domain::invoice::InvoiceSortField")]
#[graphql(rename_items = "camelCase")]
pub enum InvoiceSortFieldInput {
    Type,
    OtherPartyName,
    InvoiceNumber,
    Comment,
    Status,
    CreatedDatetime,
    AllocatedDatetime,
    PickedDatetime,
    ShippedDatetime,
    DeliveredDatetime,
    VerifiedDatetime,
}

pub type InvoiceSortInput = SortInput<InvoiceSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct InvoiceFilterInput {
    pub invoice_number: Option<EqualFilterNumberInput>,
    pub name_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInput<InvoiceNodeType>>,
    pub status: Option<EqualFilterInput<InvoiceNodeStatus>>,
    pub comment: Option<SimpleStringFilterInput>,
    pub their_reference: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub allocated_datetime: Option<DatetimeFilterInput>,
    pub picked_datetime: Option<DatetimeFilterInput>,
    pub shipped_datetime: Option<DatetimeFilterInput>,
    pub delivered_datetime: Option<DatetimeFilterInput>,
    pub verified_datetime: Option<DatetimeFilterInput>,
}

impl From<InvoiceFilterInput> for InvoiceFilter {
    fn from(f: InvoiceFilterInput) -> Self {
        InvoiceFilter {
            id: None,
            invoice_number: f.invoice_number.map(EqualFilter::from),
            name_id: f.name_id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            r#type: f.r#type.map(EqualFilter::from),
            status: f.status.map(EqualFilter::from),
            comment: f.comment.map(SimpleStringFilter::from),
            their_reference: f.their_reference.map(EqualFilter::from),
            created_datetime: f.created_datetime.map(DatetimeFilter::from),
            allocated_datetime: f.allocated_datetime.map(DatetimeFilter::from),
            picked_datetime: f.picked_datetime.map(DatetimeFilter::from),
            shipped_datetime: f.shipped_datetime.map(DatetimeFilter::from),
            delivered_datetime: f.delivered_datetime.map(DatetimeFilter::from),
            verified_datetime: f.verified_datetime.map(DatetimeFilter::from),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[graphql(remote = "domain::invoice::InvoiceType")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InvoiceNodeType {
    OutboundShipment,
    InboundShipment,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[graphql(remote = "domain::invoice::InvoiceStatus")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum InvoiceNodeStatus {
    New,
    Allocated,
    Picked,
    Shipped,
    Delivered,
    Verified,
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

    pub async fn on_hold(&self) -> bool {
        self.invoice.on_hold
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.invoice.created_datetime, Utc)
    }

    pub async fn allocated_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .allocated_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn picked_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .picked_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn shipped_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .shipped_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn delivered_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .delivered_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn verified_datetime(&self) -> Option<DateTime<Utc>> {
        self.invoice
            .verified_datetime
            .map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn color(&self) -> &Option<String> {
        &self.invoice.color
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> InvoiceLinesResponse {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineQueryLoader>>();
        match loader.load_one(self.invoice.id.to_string()).await {
            Ok(result_option) => {
                InvoiceLinesResponse::Response(result_option.unwrap_or(Vec::new()).into())
            }
            Err(error) => InvoiceLinesResponse::Error(error.into()),
        }
    }

    async fn pricing(&self, ctx: &Context<'_>) -> InvoicePriceResponse {
        let loader = ctx.get_loader::<DataLoader<InvoiceLineStatsLoader>>();
        let default = InvoicePricing {
            total_after_tax: 0.0,
        };

        match loader.load_one(self.invoice.id.to_string()).await {
            Ok(result_option) => {
                InvoicePriceResponse::Response(result_option.unwrap_or(default).into())
            }
            // TODO report error
            Err(error) => InvoicePriceResponse::Error(error.into()),
        }
    }

    async fn other_party(&self, ctx: &Context<'_>) -> NameResponse {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        match loader.load_one(self.invoice.other_party_id.clone()).await {
            Ok(response_option) => match response_option {
                Some(name) => NameResponse::Response(name.into()),
                None => NameResponse::Error(ErrorWrapper {
                    error: NodeErrorInterface::record_not_found(),
                }),
            },
            Err(error) => NameResponse::Error(error.into()),
        }
    }
}

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

pub fn get_invoice_response(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> InvoiceResponse {
    match get_invoice(connection_manager, id) {
        Ok(invoice) => InvoiceResponse::Response(invoice.into()),
        Err(error) => InvoiceResponse::Error(error.into()),
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

impl From<InvoicePricing> for InvoicePricingNode {
    fn from(invoice_pricing: InvoicePricing) -> Self {
        InvoicePricingNode { invoice_pricing }
    }
}
