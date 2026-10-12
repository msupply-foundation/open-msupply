use async_graphql::*;
use graphql_core::{
    ContextExt,
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::ShippingMethodConnector;
use repository::{EqualFilter, StringFilter, shipping_method::ShippingMethodFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct ShippingMethodFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub method: Option<StringFilterInput>,
}

#[derive(Union)]
pub enum ShippingMethodsResponse {
    Response(ShippingMethodConnector),
}

pub fn get_shipping_methods(
    ctx: &Context<'_>,
    store_id: &str,
    filter: Option<ShippingMethodFilterInput>,
) -> Result<ShippingMethodsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStore,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    let service = &service_provider.shipping_method_service;

    let shipping_method = service
        .get_shipping_methods(&service_context, filter.map(|filter| filter.to_domain()))
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ShippingMethodsResponse::Response(
        ShippingMethodConnector::from_domain(shipping_method),
    ))
}

impl ShippingMethodFilterInput {
    pub fn to_domain(self) -> ShippingMethodFilter {
        ShippingMethodFilter {
            id: self.id.map(EqualFilter::from),
            method: self.method.map(StringFilter::from),
        }
    }
}
