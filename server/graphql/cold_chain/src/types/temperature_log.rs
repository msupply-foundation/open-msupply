use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::{LocationByIdLoader, SensorByIdLoader, TemperatureBreachByIdLoader},
    simple_generic_errors::NodeError,
    ContextExt,
};

use graphql_types::types::{LocationFilterInput, LocationNode};
use repository::{
    temperature_log::{
        TemperatureLog, TemperatureLogFilter, TemperatureLogSort, TemperatureLogSortField,
    },
    DatetimeFilter, EqualFilter, TemperatureLogRow,
};
use service::{usize_to_u32, ListResult};

use super::{
    sensor::{SensorFilterInput, SensorNode},
    temperature_breach::{TemperatureBreachFilterInput, TemperatureBreachNode},
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum TemperatureLogSortFieldInput {
    Datetime,
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
    pub datetime: Option<DatetimeFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub sensor: Option<SensorFilterInput>,
    pub location: Option<LocationFilterInput>,
    pub temperature_breach: Option<TemperatureBreachFilterInput>,
}

impl From<TemperatureLogFilterInput> for TemperatureLogFilter {
    fn from(f: TemperatureLogFilterInput) -> Self {
        TemperatureLogFilter {
            datetime: f.datetime.map(DatetimeFilter::from),
            id: f.id.map(EqualFilter::from),
            store_id: None,
            sensor: f.sensor.map(SensorFilterInput::into),
            location: f.location.map(LocationFilterInput::into),
            temperature_breach: f.temperature_breach.map(TemperatureBreachFilterInput::into),
            temperature: None,
            temperature_breach_id: None,
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

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().datetime, Utc)
    }

    pub async fn sensor_id(&self) -> &str {
        &self.row().sensor_id
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
            from::Datetime => to::Datetime,
            from::Temperature => to::Temperature,
        };

        TemperatureLogSort {
            key,
            desc: self.desc,
        }
    }
}
