pub mod mutations;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DateFilterInput, EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{
    location::LocationFilter, DateFilter, EqualFilter, PaginationOption, StockLineFilter,
    StockLineSort, StockLineSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct StockLineQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::stock_line::StockLineSortField")]
pub enum StockLineSortFieldInput {
    ExpiryDate,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    PackSize,
    SupplierName,
    LocationCode,
    VvmStatusThenExpiry,
}
#[derive(InputObject)]
pub struct StockLineSortInput {
    /// Sort query result by `key`
    key: StockLineSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct StockLineFilterInput {
    pub expiry_date: Option<DateFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub is_available: Option<bool>,
    #[graphql(deprecation = "Since 2.11.0. Use `search` instead.")]
    pub item_code_or_name: Option<StringFilterInput>,
    pub search: Option<StringFilterInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
    pub vvm_status_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub has_packs_in_store: Option<bool>,
    pub location: Option<LocationFilterInput>,
    pub master_list: Option<MasterListFilterInput>,
    pub is_active: Option<bool>,
    pub is_program_stock_line: Option<bool>,
}

impl From<StockLineFilterInput> for StockLineFilter {
    fn from(f: StockLineFilterInput) -> Self {
        StockLineFilter {
            expiry_date: f.expiry_date.map(DateFilter::from),
            id: f.id.map(EqualFilter::from),
            is_available: f.is_available,
            search: f
                .search
                .or(f.item_code_or_name)
                .map(StringFilterInput::into),
            item_id: f.item_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
            store_id: None,
            vvm_status_id: f.vvm_status_id.map(EqualFilter::from),
            has_packs_in_store: f.has_packs_in_store,
            location: f.location.map(LocationFilter::from),
            master_list: f.master_list.map(|f| f.to_domain()),
            is_active: f.is_active,
            is_program_stock_line: f.is_program_stock_line,
        }
    }
}

impl StockLineSortInput {
    pub fn to_domain(self) -> StockLineSort {
        StockLineSort {
            key: StockLineSortField::from(self.key),
            desc: self.desc,
        }
    }
}

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
            .store_id(EqualFilter::equal_to(&store_id));

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
                        item_id: Some(EqualFilter::equal_to(&item_id)),
                        store_id: Some(EqualFilter::equal_to(&store_id)),
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
