use async_graphql::*;
use domain::DatetimeFilter;
use domain::EqualFilter;
use domain::PaginationOption;
use repository::schema::StockTakeStatus;
use repository::StockTakeFilter;
use service::permission_validation::Resource;
use service::permission_validation::ResourceAccessRequest;
use service::ListError;

use crate::schema::types::StockTakeNode;
use crate::schema::types::StockTakeNodeStatus;
use crate::schema::types::{
    sort_filter_types::{
        convert_sort, DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterInput,
        EqualFilterStringInput,
    },
    PaginationInput,
};
use crate::standard_graphql_error::validate_auth;
use crate::standard_graphql_error::StandardGraphqlError;
use crate::ContextExt;

use super::SortInput;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::StockTakeSortField")]
#[graphql(rename_items = "camelCase")]
pub enum StockTakeSortFieldInput {
    Status,
    CreatedDatetime,
    FinalisedDatetime,
}
pub type StockTakeSortInput = SortInput<StockTakeSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct StockTakeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub stock_take_number: Option<EqualFilterBigNumberInput>,
    pub status: Option<EqualFilterInput<StockTakeNodeStatus>>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub finalised_datetime: Option<DatetimeFilterInput>,
}

impl From<StockTakeFilterInput> for StockTakeFilter {
    fn from(f: StockTakeFilterInput) -> Self {
        StockTakeFilter {
            id: f.id.map(EqualFilter::from),
            store_id: None,
            stock_take_number: f.stock_take_number.map(EqualFilter::from),
            status: f.status.map(|status| EqualFilter {
                equal_to: status.equal_to.map(StockTakeStatus::from),
                equal_any: status
                    .equal_any
                    .map(|types| types.into_iter().map(StockTakeStatus::from).collect()),
                not_equal_to: status.not_equal_to.map(StockTakeStatus::from),
                not_equal_all: None,
            }),
            created_datetime: f.created_datetime.map(DatetimeFilter::from),
            finalised_datetime: f.finalised_datetime.map(DatetimeFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct StockTakeConnector {
    total_count: u32,
    nodes: Vec<StockTakeNode>,
}

#[derive(Union)]
pub enum StockTakesResponse {
    Response(StockTakeConnector),
}

pub fn stock_takes(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<StockTakeFilterInput>,
    sort: Option<Vec<StockTakeSortInput>>,
) -> Result<StockTakesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockTakes,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stock_take_service;

    match service.get_stock_takes(
        &service_ctx,
        store_id,
        page.map(PaginationOption::from),
        filter.map(StockTakeFilter::from),
        convert_sort(sort),
    ) {
        Ok(stock_takes) => Ok(StockTakesResponse::Response(StockTakeConnector {
            total_count: stock_takes.count,
            nodes: stock_takes
                .rows
                .into_iter()
                .map(|stock_take| StockTakeNode { stock_take })
                .collect(),
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                ListError::DatabaseError(err) => err.into(),
                ListError::LimitBelowMin(_) => StandardGraphqlError::BadUserInput(formatted_error),
                ListError::LimitAboveMax(_) => StandardGraphqlError::BadUserInput(formatted_error),
            };
            Err(graphql_error.extend())
        }
    }
}
