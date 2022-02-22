use crate::schema::types::ErrorWrapper;
use crate::schema::types::NodeError;
use crate::schema::types::NodeErrorInterface;
use crate::schema::types::RecordNotFound;
use crate::schema::types::StocktakeNode;
use crate::schema::types::StocktakeNodeStatus;
use crate::schema::types::{
    sort_filter_types::{
        DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterInput, EqualFilterStringInput,
    },
    PaginationInput,
};
use crate::standard_graphql_error::list_error_to_gql_err;
use crate::standard_graphql_error::validate_auth;
use crate::standard_graphql_error::StandardGraphqlError;
use crate::ContextExt;
use async_graphql::*;
use domain::DatetimeFilter;
use domain::EqualFilter;
use domain::PaginationOption;
use repository::schema::StocktakeStatus;
use repository::StocktakeFilter;
use repository::{StocktakeSort, StocktakeSortField};
use service::permission_validation::Resource;
use service::permission_validation::ResourceAccessRequest;
use service::ListError;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum StocktakeSortFieldInput {
    Status,
    CreatedDatetime,
    FinalisedDatetime,
}

#[derive(InputObject)]
pub struct StocktakeSortInput {
    /// Sort query result by `key`
    key: StocktakeSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct StocktakeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub stocktake_number: Option<EqualFilterBigNumberInput>,
    pub status: Option<EqualFilterInput<StocktakeNodeStatus>>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub finalised_datetime: Option<DatetimeFilterInput>,
}

impl From<StocktakeFilterInput> for StocktakeFilter {
    fn from(f: StocktakeFilterInput) -> Self {
        StocktakeFilter {
            id: f.id.map(EqualFilter::from),
            store_id: None,
            stocktake_number: f.stocktake_number.map(EqualFilter::from),
            status: f.status.map(|t| t.map_to_domain(StocktakeStatus::from)),
            created_datetime: f.created_datetime.map(DatetimeFilter::from),
            finalised_datetime: f.finalised_datetime.map(DatetimeFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct StocktakeConnector {
    total_count: u32,
    nodes: Vec<StocktakeNode>,
}

#[derive(Union)]
pub enum StocktakesResponse {
    Response(StocktakeConnector),
}

pub fn stocktakes(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<StocktakeFilterInput>,
    sort: Option<Vec<StocktakeSortInput>>,
) -> Result<StocktakesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stocktake_service;

    match service.get_stocktakes(
        &service_ctx,
        store_id,
        page.map(PaginationOption::from),
        filter.map(StocktakeFilter::from),
        // Currently only one sort option is supported, use the first from the list.
        sort.map(|mut sort_list| sort_list.pop())
            .flatten()
            .map(|sort| sort.to_domain()),
    ) {
        Ok(stocktakes) => Ok(StocktakesResponse::Response(StocktakeConnector {
            total_count: stocktakes.count,
            nodes: stocktakes
                .rows
                .into_iter()
                .map(|stocktake| StocktakeNode { stocktake })
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

#[derive(Union)]
pub enum StocktakeResponse {
    Response(StocktakeNode),
    Error(NodeError),
}

pub fn stocktake(ctx: &Context<'_>, store_id: &str, id: &str) -> Result<StocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stocktake_service;

    match service.get_stocktakes(
        &service_ctx,
        store_id,
        None,
        Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))),
        None,
    ) {
        Ok(mut stocktakes) => {
            let result = match stocktakes.rows.pop() {
                Some(stocktake) => StocktakeResponse::Response(StocktakeNode { stocktake }),
                None => StocktakeResponse::Error(ErrorWrapper {
                    error: NodeErrorInterface::RecordNotFound(RecordNotFound {}),
                }),
            };
            Ok(result)
        }

        Err(err) => Err(list_error_to_gql_err(err)),
    }
}

pub fn stocktake_by_number(
    ctx: &Context<'_>,
    store_id: &str,
    stocktake_number: i64,
) -> Result<StocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stocktake_service;

    match service.get_stocktakes(
        &service_ctx,
        store_id,
        None,
        Some(StocktakeFilter::new().stocktake_number(EqualFilter::equal_to_i64(stocktake_number))),
        None,
    ) {
        Ok(mut stocktakes) => {
            let result = match stocktakes.rows.pop() {
                Some(stocktake) => StocktakeResponse::Response(StocktakeNode { stocktake }),
                None => StocktakeResponse::Error(ErrorWrapper {
                    error: NodeErrorInterface::RecordNotFound(RecordNotFound {}),
                }),
            };
            Ok(result)
        }

        Err(err) => Err(list_error_to_gql_err(err)),
    }
}

impl StocktakeSortInput {
    pub fn to_domain(self) -> StocktakeSort {
        use StocktakeSortField as to;
        use StocktakeSortFieldInput as from;
        let key = match self.key {
            from::Status => to::Status,
            from::CreatedDatetime => to::CreatedDatetime,
            from::FinalisedDatetime => to::FinalisedDatetime,
        };

        StocktakeSort {
            key,
            desc: self.desc,
        }
    }
}
