use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::StockLineByIdLoader,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{InvoiceNodeType, StockLineFilterInput, StockLineNode};
use repository::{
    stock_line_ledger::{
        StockLineLedgerFilter, StockLineLedgerRow, StockLineLedgerSort, StockLineLedgerSortField,
    },
    DatetimeFilter, EqualFilter, StockLineFilter,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ledger::get_ledger,
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::stock_line_ledger::StockLineLedgerSortField")]
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
    pub item_id: Option<EqualFilterStringInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub master_list_id: Option<EqualFilterStringInput>,
    pub stock_line: Option<StockLineFilterInput>,
}

#[derive(PartialEq, Debug)]
pub struct LedgerNode {
    ledger: StockLineLedgerRow,
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
        InvoiceNodeType::from(self.ledger.invoice_type.clone())
    }
    pub async fn invoice_number(&self) -> &i64 {
        &self.ledger.invoice_number
    }
    pub async fn reason(&self) -> &Option<String> {
        &self.ledger.reason
    }
    pub async fn running_balance(&self) -> &f64 {
        &self.ledger.running_balance
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let stock_line_id = match &self.ledger.stock_line_id {
            Some(id) => id.clone(),
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();
        let stock_line = loader
            .load_one(stock_line_id)
            .await?
            .map(StockLineNode::from_domain);
        Ok(stock_line)
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
        None,
        filter.map(|filter| filter.to_domain(&store_id)),
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
    pub fn from_domain(rows: ListResult<StockLineLedgerRow>) -> LedgerConnector {
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
    pub fn to_domain(self, store_id: &str) -> StockLineLedgerFilter {
        let LedgerFilterInput {
            stock_line_id,
            item_id,
            datetime,
            master_list_id,
            stock_line,
        } = self;

        StockLineLedgerFilter {
            stock_line_id: stock_line_id.map(EqualFilter::from),
            item_id: item_id.map(EqualFilter::from),
            store_id: Some(EqualFilter::equal_to(store_id.to_string())),
            datetime: datetime.map(DatetimeFilter::from),
            master_list_id: master_list_id.map(EqualFilter::from),
            stock_line: stock_line.map(StockLineFilter::from),
        }
    }
}

impl LedgerSortInput {
    pub fn to_domain(self) -> StockLineLedgerSort {
        StockLineLedgerSort {
            key: StockLineLedgerSortField::from(self.key),
            desc: self.desc,
        }
    }
}
