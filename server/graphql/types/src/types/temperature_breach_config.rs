use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::map_filter;
use graphql_core::simple_generic_errors::NodeError;

use repository::{
    temperature_breach_config::{
        TemperatureBreachConfig, TemperatureBreachConfigFilter, TemperatureBreachConfigSort,
        TemperatureBreachConfigSortField,
    },
    EqualFilter, TemperatureBreachConfigRow,
};
use service::{usize_to_u32, ListResult};

use super::{EqualFilterTemperatureBreachRowTypeInput, TemperatureBreachNodeType};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum TemperatureBreachConfigSortFieldInput {
    Description,
}

#[derive(InputObject)]
pub struct TemperatureBreachConfigSortInput {
    /// Sort query result by `key`
    key: TemperatureBreachConfigSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct TemperatureBreachConfigFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub description: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterTemperatureBreachRowTypeInput>,
    pub is_active: Option<bool>,
}

impl From<TemperatureBreachConfigFilterInput> for TemperatureBreachConfigFilter {
    fn from(f: TemperatureBreachConfigFilterInput) -> Self {
        TemperatureBreachConfigFilter {
            description: f.description.map(EqualFilter::from),
            is_active: f.is_active,
            r#type: f
                .r#type
                .map(|t| map_filter!(t, TemperatureBreachNodeType::to_domain)),
            id: f.id.map(EqualFilter::from),
            store_id: None,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct TemperatureBreachConfigNode {
    pub temperature_breach_config: TemperatureBreachConfig,
}

#[derive(SimpleObject)]
pub struct TemperatureBreachConfigConnector {
    total_count: u32,
    nodes: Vec<TemperatureBreachConfigNode>,
}

#[Object]
impl TemperatureBreachConfigNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn description(&self) -> &str {
        &self.row().description
    }

    pub async fn is_active(&self) -> bool {
        self.row().is_active
    }

    pub async fn r#type(&self) -> TemperatureBreachNodeType {
        TemperatureBreachNodeType::from_domain(&self.row().r#type)
    }
}

#[derive(Union)]
pub enum TemperatureBreachConfigsResponse {
    Response(TemperatureBreachConfigConnector),
}

#[derive(Union)]
pub enum TemperatureBreachConfigResponse {
    Error(NodeError),
    Response(TemperatureBreachConfigNode),
}

impl TemperatureBreachConfigNode {
    pub fn from_domain(
        temperature_breach_config: TemperatureBreachConfig,
    ) -> TemperatureBreachConfigNode {
        TemperatureBreachConfigNode {
            temperature_breach_config,
        }
    }

    pub fn row(&self) -> &TemperatureBreachConfigRow {
        &self.temperature_breach_config.temperature_breach_config_row
    }
}

impl TemperatureBreachConfigConnector {
    pub fn from_domain(
        temperature_breach_configs: ListResult<TemperatureBreachConfig>,
    ) -> TemperatureBreachConfigConnector {
        TemperatureBreachConfigConnector {
            total_count: temperature_breach_configs.count,
            nodes: temperature_breach_configs
                .rows
                .into_iter()
                .map(TemperatureBreachConfigNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        temperature_breach_configs: Vec<TemperatureBreachConfig>,
    ) -> TemperatureBreachConfigConnector {
        TemperatureBreachConfigConnector {
            total_count: usize_to_u32(temperature_breach_configs.len()),
            nodes: temperature_breach_configs
                .into_iter()
                .map(TemperatureBreachConfigNode::from_domain)
                .collect(),
        }
    }
}

impl TemperatureBreachConfigSortInput {
    pub fn to_domain(self) -> TemperatureBreachConfigSort {
        use TemperatureBreachConfigSortField as to;
        use TemperatureBreachConfigSortFieldInput as from;
        let key = match self.key {
            from::Description => to::Description,
        };

        TemperatureBreachConfigSort {
            key,
            desc: self.desc,
        }
    }
}
