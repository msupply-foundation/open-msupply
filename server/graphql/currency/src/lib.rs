use async_graphql::*;
use graphql_types::types::*;

use query::{get_currencies, get_currency};

mod query;

#[derive(Default, Clone)]
pub struct CurrencyQueries;

#[Object]
impl CurrencyQueries {
    pub async fn currency(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the currency")] id: String,
    ) -> Result<CurrencyResponse> {
        get_currency(ctx, &id).await
    }

    pub async fn currencies(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<CurrencySortInput>>,
    ) -> Result<CurrenciesResponse> {
        get_currencies(ctx, sort).await
    }
}
