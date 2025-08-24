use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{
    EqualFilterInvoiceStatusInput, EqualFilterInvoiceTypeInput, InvoiceNodeStatus, InvoiceNodeType,
};
use repository::{
    DatetimeFilter, EqualFilter, InvoiceStatus, InvoiceType, ItemLedgerFilter, ItemLedgerRow,
    PaginationOption,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    ledger::get_item_ledger,
    ListResult,
};

#[derive(InputObject, Clone)]
pub struct ItemLedgerFilterInput {
    pub item_id: Option<EqualFilterStringInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub invoice_type: Option<EqualFilterInvoiceTypeInput>,
    pub invoice_status: Option<EqualFilterInvoiceStatusInput>,
}

#[derive(PartialEq, Debug)]
pub struct ItemLedgerNode {
    item_ledger: ItemLedgerRow,
}

#[Object]
impl ItemLedgerNode {
    pub async fn id(&self) -> &String {
        &self.item_ledger.id
    }
    pub async fn item_id(&self) -> &String {
        &self.item_ledger.item_id
    }
    pub async fn store_id(&self) -> &String {
        &self.item_ledger.store_id
    }
    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.item_ledger.datetime, Utc)
    }
    pub async fn name(&self) -> &String {
        &self.item_ledger.name
    }
    pub async fn movement_in_units(&self) -> &f64 {
        &self.item_ledger.movement_in_units
    }
    pub async fn invoice_type(&self) -> InvoiceNodeType {
        InvoiceNodeType::from(self.item_ledger.invoice_type.clone())
    }
    pub async fn invoice_number(&self) -> &i64 {
        &self.item_ledger.invoice_number
    }
    pub async fn invoice_id(&self) -> &String {
        &self.item_ledger.invoice_id
    }
    pub async fn reason(&self) -> &Option<String> {
        &self.item_ledger.reason
    }

    pub async fn invoice_status(&self) -> InvoiceNodeStatus {
        InvoiceNodeStatus::from(self.item_ledger.invoice_status.clone())
    }

    pub async fn pack_size(&self) -> &f64 {
        &self.item_ledger.pack_size
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.item_ledger.expiry_date
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.item_ledger.batch
    }

    pub async fn cost_price_per_pack(&self) -> &f64 {
        &self.item_ledger.cost_price_per_pack
    }

    pub async fn sell_price_per_pack(&self) -> &f64 {
        &self.item_ledger.sell_price_per_pack
    }

    pub async fn total_before_tax(&self) -> &Option<f64> {
        &self.item_ledger.total_before_tax
    }

    pub async fn balance(&self) -> &f64 {
        &self.item_ledger.running_balance
    }

    pub async fn number_of_packs(&self) -> &f64 {
        &self.item_ledger.number_of_packs
    }
}

#[derive(SimpleObject)]
pub struct ItemLedgerConnector {
    total_count: u32,
    nodes: Vec<ItemLedgerNode>,
}

#[derive(Union)]
pub enum ItemLedgerResponse {
    Response(ItemLedgerConnector),
}

pub fn item_ledger(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ItemLedgerFilterInput>,
) -> Result<ItemLedgerResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let ledger = get_item_ledger(
        &ctx.get_connection_manager().connection()?,
        &store_id,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ItemLedgerResponse::Response(
        ItemLedgerConnector::from_domain(ledger),
    ))
}

impl ItemLedgerConnector {
    pub fn from_domain(rows: ListResult<ItemLedgerRow>) -> ItemLedgerConnector {
        ItemLedgerConnector {
            total_count: rows.count,
            nodes: rows
                .rows
                .into_iter()
                .map(|item_ledger| ItemLedgerNode { item_ledger })
                .collect(),
        }
    }
}

impl ItemLedgerFilterInput {
    pub fn to_domain(self) -> ItemLedgerFilter {
        let ItemLedgerFilterInput {
            datetime,
            item_id,
            invoice_type,
            invoice_status,
        } = self;

        ItemLedgerFilter {
            item_id: item_id.map(EqualFilter::from),
            datetime: datetime.map(DatetimeFilter::from),
            invoice_type: invoice_type.map(|t| map_filter!(t, |i| InvoiceType::from(i))),
            invoice_status: invoice_status.map(|s| map_filter!(s, |i| InvoiceStatus::from(i))),
            store_id: None,
        }
    }
}
