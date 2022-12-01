pub mod mutations;
use async_graphql::*;
use graphql_core::{
    generic_filters::{DateFilterInput, EqualFilterStringInput, SimpleStringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::{
    DateFilter, EqualFilter, PaginationOption, StockLineFilter, StockLineSort, StockLineSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct StockLineQueries;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum StockLineSortFieldInput {
    ExpiryDate,
    NumberOfPacks,
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
    pub item_code_or_name: Option<SimpleStringFilterInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
}

impl From<StockLineFilterInput> for StockLineFilter {
    fn from(f: StockLineFilterInput) -> Self {
        StockLineFilter {
            expiry_date: f.expiry_date.map(DateFilter::from),
            id: f.id.map(EqualFilter::from),
            is_available: f.is_available,
            item_code_or_name: f.item_code_or_name.map(SimpleStringFilterInput::into),
            item_id: f.item_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
            store_id: None,
        }
    }
}

impl StockLineSortInput {
    pub fn to_domain(self) -> StockLineSort {
        use StockLineSortField as to;
        use StockLineSortFieldInput as from;
        let key = match self.key {
            from::NumberOfPacks => to::NumberOfPacks,
            from::ExpiryDate => to::ExpiryDate,
        };

        StockLineSort {
            key,
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
            .unwrap_or(StockLineFilter::new())
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
            )
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
    async fn update_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input)
    }
}
