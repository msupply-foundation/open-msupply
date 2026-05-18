use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

use graphql_types::types::{
    CurrenciesResponse, CurrencyConnector, CurrencyFilterInput, CurrencySortInput,
};

pub async fn currencies(
    ctx: &Context<'_>,
    filter: Option<CurrencyFilterInput>,
    sort: Option<Vec<CurrencySortInput>>,
) -> Result<CurrenciesResponse> {
    let service_provider = ctx.service_provider_data();
    let domain_filter = filter.map(|filter| filter.to_domain());
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let currencies = tokio::task::spawn_blocking(move || -> Result<_, service::ListError> {
        let service_context = service_provider.basic_context()?;
        let currency_service = &service_provider.currency_service;
        currency_service.get_currencies(&service_context, domain_filter, domain_sort)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CurrenciesResponse::Response(
        CurrencyConnector::from_domain(currencies),
    ))
}
