use async_graphql::*;
use domain::EqualFilter;
use domain::PaginationOption;
use repository::StockTakeLineFilter;
use service::permission_validation::Resource;
use service::permission_validation::ResourceAccessRequest;
use service::stock_take_line::query::GetStockTakeLinesError;
use service::ListError;

use crate::schema::types::StockTakeLineNode;
use crate::schema::types::{sort_filter_types::EqualFilterStringInput, PaginationInput};
use crate::standard_graphql_error::validate_auth;
use crate::standard_graphql_error::StandardGraphqlError;
use crate::ContextExt;

#[derive(InputObject, Clone)]
pub struct StockTakeLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub stock_take_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
}

impl From<StockTakeLineFilterInput> for StockTakeLineFilter {
    fn from(f: StockTakeLineFilterInput) -> Self {
        StockTakeLineFilter {
            id: f.id.map(EqualFilter::from),
            stock_take_id: f.stock_take_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct StockTakeLineConnector {
    total_count: u32,
    nodes: Vec<StockTakeLineNode>,
}

#[derive(Union)]
pub enum StockTakeLinesResponse {
    Response(StockTakeLineConnector),
}

pub fn stock_take_lines(
    ctx: &Context<'_>,
    store_id: &str,
    stock_take_id: &str,
    page: Option<PaginationInput>,
    filter: Option<StockTakeLineFilterInput>,
) -> Result<StockTakeLinesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockTakeLines,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stock_take_line_service;

    match service.get_stock_take_lines(
        &service_ctx,
        store_id,
        stock_take_id,
        page.map(PaginationOption::from),
        filter.map(StockTakeLineFilter::from),
        None,
    ) {
        Ok(stock_take_lines) => Ok(StockTakeLinesResponse::Response(StockTakeLineConnector {
            total_count: stock_take_lines.count,
            nodes: stock_take_lines
                .rows
                .into_iter()
                .map(|line| StockTakeLineNode { line })
                .collect(),
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                GetStockTakeLinesError::DatabaseError(err) => err.into(),
                GetStockTakeLinesError::InvalidStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                GetStockTakeLinesError::InvalidStockTake => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                GetStockTakeLinesError::ListError(err) => match err {
                    ListError::DatabaseError(err) => err.into(),
                    ListError::LimitBelowMin(_) => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    ListError::LimitAboveMax(_) => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                },
            };
            Err(graphql_error.extend())
        }
    }
}
