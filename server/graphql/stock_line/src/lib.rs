pub mod mutations;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{EqualFilter, PaginationOption, StockLineFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct StockLineQueries;

#[Object]
impl StockLineQueries {
    /// Query for "stock_line" entries
    pub async fn stock_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<StockLineFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<StockLineSortInput>>,
    ) -> Result<StockLinesResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStockLine,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        // always filter by store_id
        let filter = filter
            .map(StockLineFilter::from)
            .unwrap_or_default()
            .store_id(EqualFilter::equal_to(store_id.to_string()));

        let stock_lines = service_provider
            .stock_line_service
            .get_stock_lines(
                &service_context,
                page.map(PaginationOption::from),
                Some(filter),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
                Some(store_id),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(StockLinesResponse::Response(
            StockLineConnector::from_domain(stock_lines),
        ))
    }

    /// Query for "historical_stock_line" entries
    pub async fn historical_stock_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        item_id: String,
        datetime: Option<DateTime<Utc>>,
    ) -> Result<StockLinesResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStockLine,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        let stock_lines = match datetime {
            None => service_provider
                .stock_line_service
                .get_stock_lines(
                    &service_context,
                    None,
                    Some(StockLineFilter {
                        item_id: Some(EqualFilter::equal_to(item_id.to_string())),
                        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
                        is_available: Some(true),
                        ..Default::default()
                    }),
                    None,
                    Some(store_id),
                )
                .map_err(StandardGraphqlError::from_list_error)?,
            Some(datetime) => service_provider
                .stock_line_service
                .get_historical_stock_lines(
                    &service_context,
                    store_id,
                    item_id,
                    datetime.naive_utc(),
                )
                .map_err(StandardGraphqlError::from_list_error)?,
        };

        Ok(StockLinesResponse::Response(
            StockLineConnector::from_domain(stock_lines),
        ))
    }
}

#[derive(Default, Clone)]
pub struct StockLineMutations;

#[Object]
impl StockLineMutations {
    async fn insert_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::InsertInput,
    ) -> Result<mutations::InsertResponse> {
        mutations::insert(ctx, &store_id, input)
    }

    async fn update_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input)
    }
}
