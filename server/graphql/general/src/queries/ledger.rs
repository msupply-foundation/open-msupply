use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::InvoiceNodeType;
use repository::{
    ledger::{LedgerFilter, LedgerRow, LedgerSort, LedgerSortField},
    EqualFilter,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    ledger::get_ledger,
    ListResult,
};

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

#[derive(InputObject)]
pub struct LedgerSortInput {
    /// Sort query result by `key`
    key: LedgerSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the
    /// default is ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct LedgerFilterInput {
    pub stock_line_id: Option<EqualFilterStringInput>,
}

#[derive(PartialEq, Debug)]
pub struct LedgerNode {
    ledger: LedgerRow,
}

#[Object]
impl LedgerNode {
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
    pub async fn reason(&self) -> &Option<String> {
        if self.ledger.return_reason.is_some() {
            return &self.ledger.return_reason;
        }
        &self.ledger.inventory_adjustment_reason
    }
}

#[derive(SimpleObject)]
pub struct LedgerConnector {
    total_count: u32,
    nodes: Vec<LedgerNode>,
}

#[derive(Union)]
pub enum LedgerResponse {
    Response(LedgerConnector),
}

pub fn ledger(
    ctx: &Context<'_>,
    store_id: String,
    // page: Option<PaginationInput>,
    filter: Option<LedgerFilterInput>,
    sort: Option<Vec<LedgerSortInput>>,
) -> Result<LedgerResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let ledger = get_ledger(
        connection_manager,
        // page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(LedgerResponse::Response(LedgerConnector::from_domain(
        ledger,
    )))
}

impl LedgerConnector {
    pub fn from_domain(rows: ListResult<LedgerRow>) -> LedgerConnector {
        LedgerConnector {
            total_count: rows.count,
            nodes: rows
                .rows
                .into_iter()
                .map(|ledger| LedgerNode { ledger })
                .collect(),
        }
    }
}
impl LedgerFilterInput {
    pub fn to_domain(self) -> LedgerFilter {
        let LedgerFilterInput { stock_line_id } = self;

        LedgerFilter {
            stock_line_id: stock_line_id.map(EqualFilter::from),
        }
    }
}

impl LedgerSortInput {
    pub fn to_domain(self) -> LedgerSort {
        use LedgerSortField as to;
        use LedgerSortFieldInput as from;
        let key = match self.key {
            from::Datetime => to::Datetime,
            from::Name => to::Name,
            from::InvoiceType => to::InvoiceType,
            from::Quantity => to::Quantity,
            from::StockLineId => to::StockLineId,
            from::ItemId => to::ItemId,
        };

        LedgerSort {
            key,
            desc: self.desc,
        }
    }
}
