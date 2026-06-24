use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::{PropertiesV2Response, PropertyV2Connector};
use repository::{EqualFilter, PropertyV2Filter};

#[derive(InputObject, Clone)]
pub struct PropertyV2FilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub key: Option<EqualFilterStringInput>,
    /// Restricts to properties marked visible (`property_table_v2.is_visible
    /// = true`) on this table_name. Use `{ equalTo: "name" }` to fetch the
    /// definitions that drive name list views / modal.
    pub table_name: Option<EqualFilterStringInput>,
}

impl From<PropertyV2FilterInput> for PropertyV2Filter {
    fn from(f: PropertyV2FilterInput) -> Self {
        PropertyV2Filter {
            id: f.id.map(EqualFilter::from),
            key: f.key.map(EqualFilter::from),
            table_name: f.table_name.map(EqualFilter::from),
        }
    }
}

pub fn properties_v2(
    ctx: &Context<'_>,
    filter: Option<PropertyV2FilterInput>,
) -> Result<PropertiesV2Response> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .property_v2_service
        .get_properties_v2(&service_context, filter.map(PropertyV2Filter::from))
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PropertiesV2Response::Response(
        PropertyV2Connector::from_domain(result),
    ))
}
