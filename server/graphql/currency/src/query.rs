use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::{
    CurrenciesResponse, CurrencyConnector, CurrencyNode, CurrencyResponse, CurrencySortInput,
};

pub async fn get_currency(ctx: &Context<'_>, currency_id: &str) -> Result<CurrencyResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let currency_service = &service_provider.currency_service;

    let currency_option = currency_service.get_currency(&service_context, &currency_id)?;

    let response = match currency_option {
        Some(currency) => CurrencyResponse::Response(CurrencyNode::from_domain(currency)),
        None => CurrencyResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}

pub async fn get_currencies(
    ctx: &Context<'_>,
    sort: Option<Vec<CurrencySortInput>>,
) -> Result<CurrenciesResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let currency_service = &service_provider.currency_service;

    let currencies = currency_service
        .get_currencies(
            &service_context,
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CurrenciesResponse::Response(
        CurrencyConnector::from_domain(currencies),
    ))
}
