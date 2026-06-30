use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::{CustomFieldsResponse, CustomFieldConnector};
use repository::{EqualFilter, CustomFieldFilter};

#[derive(InputObject, Clone)]
pub struct CustomFieldFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub key: Option<EqualFilterStringInput>,
    /// Restricts to custom_fields shown on this scope
    /// (`custom_field_scope.display_mode != HIDDEN`). Use e.g.
    /// `{ equalTo: "customer" }` or `{ equalTo: "supplier" }` to fetch the
    /// definitions that drive the matching name list views / modal. When a
    /// single `equalTo` scope is given, each returned node carries its
    /// `displayMode` for that scope.
    pub scope: Option<EqualFilterStringInput>,
}

impl From<CustomFieldFilterInput> for CustomFieldFilter {
    fn from(f: CustomFieldFilterInput) -> Self {
        CustomFieldFilter {
            id: f.id.map(EqualFilter::from),
            key: f.key.map(EqualFilter::from),
            scope: f.scope.map(EqualFilter::from),
        }
    }
}

pub fn custom_fields(
    ctx: &Context<'_>,
    filter: Option<CustomFieldFilterInput>,
) -> Result<CustomFieldsResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .custom_field_service
        .get_custom_fields(&service_context, filter.map(CustomFieldFilter::from))
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CustomFieldsResponse::Response(
        CustomFieldConnector::from_domain(result),
    ))
}
