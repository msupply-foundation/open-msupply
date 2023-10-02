use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::{LocationByIdLoader, SensorByIdLoader, TemperatureBreachByIdLoader},
    map_filter,
    simple_generic_errors::NodeError,
    ContextExt,
};

use repository::{
    temperature_log::{
        TemperatureLog, TemperatureLogFilter, TemperatureLogSort, TemperatureLogSortField,
    },
    DatetimeFilter, EqualFilter, TemperatureLogRow,
};
use service::{usize_to_u32, ListResult};

use super::{
    temperature_breach::{EqualFilterTemperatureBreachRowTypeInput, TemperatureBreachNodeType},
    LocationNode, SensorNode, TemperatureBreachNode,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum TemperatureLogSortFieldInput {
    Timestamp,
    Temperature,
}
#[derive(InputObject)]
pub struct TemperatureLogSortInput {
    /// Sort query result by `key`
    key: TemperatureLogSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct TemperatureLogFilterInput {
    pub sensor_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
    pub timestamp: Option<DatetimeFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub sensor_name: Option<EqualFilterStringInput>,
    pub location_name: Option<EqualFilterStringInput>,
    pub breach_type: Option<EqualFilterTemperatureBreachRowTypeInput>,
}

impl From<TemperatureLogFilterInput> for TemperatureLogFilter {
    fn from(f: TemperatureLogFilterInput) -> Self {
        TemperatureLogFilter {
            sensor_id: f.sensor_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
            timestamp: f.timestamp.map(DatetimeFilter::from),
            id: f.id.map(EqualFilter::from),
            store_id: None,
            sensor_name: f.sensor_name.map(EqualFilter::from),
            location_name: f.location_name.map(EqualFilter::from),
            breach_type: f
                .breach_type
                .map(|t| map_filter!(t, TemperatureBreachNodeType::to_domain)),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct TemperatureLogNode {
    pub temperature_log: TemperatureLog,
}

#[derive(SimpleObject)]
pub struct TemperatureLogConnector {
    total_count: u32,
    nodes: Vec<TemperatureLogNode>,
}

#[Object]
impl TemperatureLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn temperature(&self) -> f64 {
        self.row().temperature
    }

    pub async fn timestamp(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row().timestamp, Utc)
    }

    pub async fn sensor(&self, ctx: &Context<'_>) -> Result<Option<SensorNode>> {
        let loader = ctx.get_loader::<DataLoader<SensorByIdLoader>>();

        Ok(loader
            .load_one(self.row().sensor_id.clone())
            .await?
            .map(SensorNode::from_domain))
    }

    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let location_id = match &self.row().location_id {
            Some(location_id) => location_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        Ok(loader
            .load_one(location_id.clone())
            .await?
            .map(LocationNode::from_domain))
    }

    pub async fn temperature_breach(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<TemperatureBreachNode>> {
        let temperature_breach_id = match &self.row().temperature_breach_id {
            Some(temperature_breach_id) => temperature_breach_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<TemperatureBreachByIdLoader>>();

        Ok(loader
            .load_one(temperature_breach_id.to_string())
            .await?
            .map(TemperatureBreachNode::from_domain))
    }
}

#[derive(Union)]
pub enum TemperatureLogsResponse {
    Response(TemperatureLogConnector),
}

#[derive(Union)]
pub enum TemperatureLogResponse {
    Error(NodeError),
    Response(TemperatureLogNode),
}

impl TemperatureLogNode {
    pub fn from_domain(temperature_log: TemperatureLog) -> TemperatureLogNode {
        TemperatureLogNode { temperature_log }
    }

    pub fn row(&self) -> &TemperatureLogRow {
        &self.temperature_log.temperature_log_row
    }
}

impl TemperatureLogConnector {
    pub fn from_domain(temperature_logs: ListResult<TemperatureLog>) -> TemperatureLogConnector {
        TemperatureLogConnector {
            total_count: temperature_logs.count,
            nodes: temperature_logs
                .rows
                .into_iter()
                .map(TemperatureLogNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(temperature_logs: Vec<TemperatureLog>) -> TemperatureLogConnector {
        TemperatureLogConnector {
            total_count: usize_to_u32(temperature_logs.len()),
            nodes: temperature_logs
                .into_iter()
                .map(TemperatureLogNode::from_domain)
                .collect(),
        }
    }
}

impl TemperatureLogSortInput {
    pub fn to_domain(self) -> TemperatureLogSort {
        use TemperatureLogSortField as to;
        use TemperatureLogSortFieldInput as from;
        let key = match self.key {
            from::Timestamp => to::Timestamp,
            from::Temperature => to::Temperature,
        };

        TemperatureLogSort {
            key,
            desc: self.desc,
        }
    }
}
