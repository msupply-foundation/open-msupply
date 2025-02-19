use crate::types::{PluginDataNode, RelatedRecordNodeType};
use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{EqualFilter, PluginDataFilter, PluginDataSort, PluginDataSortField};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum PluginDataResponse {
    Response(PluginDataNode),
    Error(NodeError),
}

#[derive(InputObject, Clone)]
pub struct EqualFilterRelatedRecordTypeInput {
    pub equal_to: Option<RelatedRecordNodeType>,
    pub equal_any: Option<Vec<RelatedRecordNodeType>>,
    pub not_equal_to: Option<RelatedRecordNodeType>,
}

#[derive(InputObject, Clone)]
pub struct PluginDataFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub plugin_name: Option<EqualFilterStringInput>,
    pub related_record_id: Option<EqualFilterStringInput>,
    pub related_record_type: Option<EqualFilterRelatedRecordTypeInput>,
    pub store_id: Option<EqualFilterStringInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PluginDataSortFieldInput {
    Id,
    PluginName,
    RelatedRecordId,
    RelatedRecordType,
}

#[derive(InputObject)]
pub struct PluginDataSortInput {
    /// Sort query result by `key`
    key: PluginDataSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

pub fn get_plugin_data(
    ctx: &Context<'_>,
    store_id: &str,
    r#type: RelatedRecordNodeType,
    filter: Option<PluginDataFilterInput>,
    sort: Option<Vec<PluginDataSortInput>>,
) -> Result<PluginDataResponse> {
    let resource = map_resource_type(r#type);

    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let plugin_data = service_provider
        .plugin_data_service
        .get_plugin_data(
            &service_context,
            filter.map(|f| f.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|s| s.to_domain()),
        )
        .map_err(StandardGraphqlError::from_repository_error)?;

    let response = match plugin_data {
        Some(plugin_data) => PluginDataResponse::Response(PluginDataNode::from_domain(plugin_data)),
        None => PluginDataResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}

fn map_resource_type(from: RelatedRecordNodeType) -> Resource {
    use RelatedRecordNodeType as from;
    use Resource as to;

    match from {
        from::StockLine => to::QueryStockLine,
    }
}

impl PluginDataFilterInput {
    pub fn to_domain(self) -> PluginDataFilter {
        PluginDataFilter {
            id: self.id.map(EqualFilter::from),
            plugin_name: self.plugin_name.map(EqualFilter::from),
            related_record_id: self.related_record_id.map(EqualFilter::from),
            related_record_type: self
                .related_record_type
                .map(|r| map_filter!(r, RelatedRecordNodeType::to_domain)),
            store_id: self.store_id.map(EqualFilter::from),
        }
    }
}

impl PluginDataSortInput {
    pub fn to_domain(self) -> PluginDataSort {
        use PluginDataSortField as to;
        use PluginDataSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::PluginName => to::PluginName,
            from::RelatedRecordId => to::RelatedRecordId,
            from::RelatedRecordType => to::RelatedRecordType,
        };

        PluginDataSort {
            key,
            desc: self.desc,
        }
    }
}
