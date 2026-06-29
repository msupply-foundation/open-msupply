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
    /// Restricts to custom_fields shown on this table_name
    /// (`custom_field_table.display_mode != HIDDEN`). Use `{ equalTo: "name" }`
    /// to fetch the definitions that drive name list views / modal. When a
    /// single `equalTo` table is given, each returned node carries its
    /// `displayMode` for that scope.
    pub table_name: Option<EqualFilterStringInput>,
}

impl From<CustomFieldFilterInput> for CustomFieldFilter {
    fn from(f: CustomFieldFilterInput) -> Self {
        CustomFieldFilter {
            id: f.id.map(EqualFilter::from),
            key: f.key.map(EqualFilter::from),
            table_name: f.table_name.map(EqualFilter::from),
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
