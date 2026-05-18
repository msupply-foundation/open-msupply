pub mod mutations;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DateFilterInput, EqualFilterStringInput, StringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_general::{ItemSortInput, ItemsResponse};
use graphql_types::types::*;
use repository::{
    location::LocationFilter, DateFilter, EqualFilter, PaginationOption, StockLineFilter,
    StockLineSort, StockLineSortField, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct StockLineQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::stock_line::StockLineSortField")]
pub enum StockLineSortFieldInput {
    ExpiryDate,
    ManufactureDate,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    PackSize,
    SupplierName,
    LocationCode,
    CostPricePerPack,
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
    pub code: Option<StringFilterInput>,
    pub name: Option<StringFilterInput>,
    pub is_available: Option<bool>,
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
            code: f.code.map(StringFilter::from),
            name: f.name.map(StringFilter::from),
            is_available: f.is_available,
            item_code_or_name: f.item_code_or_name.map(StringFilterInput::into),
            search: f.search.map(StringFilterInput::into),
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

        let service_provider = ctx.service_provider_data();

        // always filter by store_id
        let filter = filter
            .map(StockLineFilter::from)
            .unwrap_or_default()
            .store_id(EqualFilter::equal_to(store_id.clone()));
        let sort = sort
            .and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain());
        let pagination = page.map(PaginationOption::from);

        let stock_lines = tokio::task::spawn_blocking(move || {
            let service_context = service_provider
                .context(store_id.clone(), user.user_id)
                .map_err(service::ListError::DatabaseError)?;
            service_provider.stock_line_service.get_stock_lines(
                &service_context,
                pagination,
                Some(filter),
                sort,
                Some(store_id),
            )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(StockLinesResponse::Response(
            StockLineConnector::from_domain(stock_lines),
        ))
    }

    /// Query for items that have at least one stock_line matching `filter`
    /// in `store_id`, sorted/paginated by item attributes. Companion to
    /// `stockLines`: same filter shape, but the result is one row per item
    /// (suitable for an aggregated/grouped stock view). Because the predicate
    /// is identical to what `stockLines` uses, an item appears here iff at
    /// least one of its stock lines would appear in `stockLines`.
    pub async fn items_by_stock_line_filter(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Stock-line filter (same shape as the `stockLines` query)")]
        filter: Option<StockLineFilterInput>,
        #[graphql(desc = "Item-level sort (only first sort input is evaluated)")] sort: Option<
            Vec<ItemSortInput>,
        >,
    ) -> Result<ItemsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStockLine,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider_data();

        // always filter by store_id (mirrors the `stock_lines` query)
        let filter = filter
            .map(StockLineFilter::from)
            .unwrap_or_default()
            .store_id(EqualFilter::equal_to(store_id.clone()));
        let sort = sort
            .and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain());
        let pagination = page.map(PaginationOption::from);

        let items = tokio::task::spawn_blocking(move || {
            let service_context = service_provider
                .context(store_id.clone(), user.user_id)
                .map_err(service::ListError::DatabaseError)?;
            service_provider
                .stock_line_service
                .get_items_by_stock_line_filter(
                    &service_context,
                    pagination,
                    Some(filter),
                    sort,
                    Some(store_id),
                )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(ItemsResponse::Response(ItemConnector::from_domain(items)))
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

        let service_provider = ctx.service_provider_data();

        let stock_lines = tokio::task::spawn_blocking(move || {
            let service_context = service_provider
                .context(store_id.clone(), user.user_id)
                .map_err(service::ListError::DatabaseError)?;
            match datetime {
                None => service_provider.stock_line_service.get_stock_lines(
                    &service_context,
                    None,
                    Some(StockLineFilter {
                        item_id: Some(EqualFilter::equal_to(item_id.clone())),
                        store_id: Some(EqualFilter::equal_to(store_id.clone())),
                        is_available: Some(true),
                        ..Default::default()
                    }),
                    None,
                    Some(store_id),
                ),
                Some(datetime) => service_provider
                    .stock_line_service
                    .get_historical_stock_lines(
                        &service_context,
                        store_id,
                        item_id,
                        datetime.naive_utc(),
                        // Include lines that are empty *now* but had stock at the
                        // historical datetime — callers like the backdated
                        // inventory adjustment modal need to display historical
                        // availability for a specific line.
                        true,
                    ),
            }
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_list_error)?;

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
        mutations::insert(ctx, &store_id, input).await
    }

    async fn update_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input).await
    }
}
