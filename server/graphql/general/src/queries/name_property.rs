use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::PropertyNode;
use repository::NameProperty;

use service::name_property::get_name_properties;
use service::ListResult;

pub fn name_properties(ctx: &Context<'_>) -> Result<NamePropertyResponse> {
    let connection_manager = ctx.get_connection_manager();
    let properties = get_name_properties(connection_manager, None)
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(NamePropertyResponse::Response(
        NamePropertyConnector::from_domain(properties),
    ))
}

#[derive(Union)]
pub enum NamePropertyResponse {
    Response(NamePropertyConnector),
}

#[derive(SimpleObject)]
pub struct NamePropertyConnector {
    total_count: u32,
    nodes: Vec<PropertyNode>,
}

impl NamePropertyConnector {
    pub fn from_domain(name_properties: ListResult<NameProperty>) -> NamePropertyConnector {
        NamePropertyConnector {
            total_count: name_properties.count,
            nodes: name_properties
                .rows
                .into_iter()
                .map(|name_property| PropertyNode::from_domain(name_property.property_row))
                .collect(),
        }
    }
}
