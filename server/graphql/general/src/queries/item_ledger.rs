use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{InvoiceNodeStatus, InvoiceNodeType};
use repository::{ledger::LedgerRow, PaginationOption};

use service::{
    auth::{Resource, ResourceAccessRequest},
    ledger::{get_item_ledger, ItemLedger},
    ListResult,
};

use super::{LedgerFilterInput, LedgerSortInput};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum LedgerSortFieldInput {
    Datetime,
    Name,
    InvoiceType,
    Quantity,
    ItemId,
    StockLineId,
}

#[derive(PartialEq, Debug)]
pub struct ItemLedgerNode {
    ledger: LedgerRow,
    balance: f64,
}

#[Object]
impl ItemLedgerNode {
    pub async fn id(&self) -> &String {
        &self.ledger.id
    }
    pub async fn stock_line_id(&self) -> &Option<String> {
        &self.ledger.stock_line_id
    }
    pub async fn item_id(&self) -> &String {
        &self.ledger.item_id
    }
    pub async fn store_id(&self) -> &String {
        &self.ledger.store_id
    }
    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.ledger.datetime, Utc)
    }
    pub async fn name(&self) -> &String {
        &self.ledger.name
    }
    pub async fn quantity(&self) -> &f64 {
        &self.ledger.quantity
    }
    pub async fn invoice_type(&self) -> InvoiceNodeType {
        InvoiceNodeType::from_domain(&self.ledger.invoice_type)
    }
    pub async fn invoice_number(&self) -> &i64 {
        &self.ledger.invoice_number
    }
    pub async fn reason(&self) -> &Option<String> {
        if self.ledger.return_reason.is_some() {
            return &self.ledger.return_reason;
        }
        &self.ledger.inventory_adjustment_reason
    }

    pub async fn invoice_status(&self) -> InvoiceNodeStatus {
        InvoiceNodeStatus::from_domain(&self.ledger.invoice_status)
    }

    pub async fn pack_size(&self) -> &f64 {
        &self.ledger.pack_size
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.ledger.expiry_date
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.ledger.batch
    }

    pub async fn cost_price_per_pack(&self) -> &f64 {
        &self.ledger.cost_price_per_pack
    }

    pub async fn sell_price_per_pack(&self) -> &f64 {
        &self.ledger.sell_price_per_pack
    }

    pub async fn total_before_tax(&self) -> &Option<f64> {
        &self.ledger.total_before_tax
    }

    pub async fn balance(&self) -> &f64 {
        &self.balance
    }

    pub async fn number_of_packs(&self) -> &f64 {
        &self.ledger.number_of_packs
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
    filter: Option<LedgerFilterInput>,
    sort: Option<Vec<LedgerSortInput>>,
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
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ItemLedgerResponse::Response(
        ItemLedgerConnector::from_domain(ledger),
    ))
}

impl ItemLedgerConnector {
    pub fn from_domain(rows: ListResult<ItemLedger>) -> ItemLedgerConnector {
        ItemLedgerConnector {
            total_count: rows.count,
            nodes: rows
                .rows
                .into_iter()
                .map(|ledger| ItemLedgerNode {
                    ledger: ledger.ledger,
                    balance: ledger.balance,
                })
                .collect(),
        }
    }
}
