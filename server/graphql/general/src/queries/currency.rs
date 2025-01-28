use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use graphql_types::types::{
    CurrenciesResponse, CurrencyConnector, CurrencyFilterInput, CurrencySortInput,
};

pub fn currencies(
    ctx: &Context<'_>,
    filter: Option<CurrencyFilterInput>,
    sort: Option<Vec<CurrencySortInput>>,
) -> Result<CurrenciesResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let currency_service = &service_provider.currency_service;

    let currencies = currency_service
        .get_currencies(
            &service_context,
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CurrenciesResponse::Response(
        CurrencyConnector::from_domain(currencies),
    ))
}
