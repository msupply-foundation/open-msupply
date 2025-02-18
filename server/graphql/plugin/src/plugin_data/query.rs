use crate::types::PluginDataConnector;
use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{EqualFilter, PluginDataFilter, PluginDataSort, PluginDataSortField};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum PluginDataResponse {
    Response(PluginDataConnector),
}

#[derive(InputObject, Clone)]
pub struct PluginDataFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub plugin_name: Option<EqualFilterStringInput>,
    pub related_record_id: Option<EqualFilterStringInput>,
    pub data_identifier: Option<EqualFilterStringInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PluginDataSortFieldInput {
    Id,
    PluginCode,
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
    filter: Option<PluginDataFilterInput>,
    sort: Option<Vec<PluginDataSortInput>>,
) -> Result<PluginDataResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ReadPluginData,
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

    Ok(PluginDataResponse::Response(
        PluginDataConnector::from_domain(plugin_data),
    ))
}

impl PluginDataFilterInput {
    pub fn to_domain(self) -> PluginDataFilter {
        PluginDataFilter {
            id: self.id.map(EqualFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
            plugin_code: self.plugin_name.map(EqualFilter::from),
            related_record_id: self.related_record_id.map(EqualFilter::from),
            data_identifier: self.data_identifier.map(EqualFilter::from),
        }
    }
}

impl PluginDataSortInput {
    pub fn to_domain(self) -> PluginDataSort {
        use PluginDataSortField as to;
        use PluginDataSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::PluginCode => to::PluginCode,
        };

        PluginDataSort {
            key,
            desc: self.desc,
        }
    }
}
