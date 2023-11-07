use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{LocationByIdLoader, SensorByIdLoader},
    simple_generic_errors::NodeError,
    ContextExt,
};

use repository::{
    temperature_breach::{TemperatureBreach, TemperatureBreachSort, TemperatureBreachSortField},
    TemperatureBreachRow, TemperatureBreachRowType,
};
use service::{
    temperature_breach::query::get_max_or_min_breach_temperature, usize_to_u32, ListResult,
};

use super::{LocationNode, SensorNode};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum TemperatureNotificationNodeType {
    ColdConsecutive,
    ColdCumulative,
    HotConsecutive,
    HotCumulative,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum TemperatureNotificationSortFieldInput {
    StartDatetime,
    EndDatetime,
}

#[derive(InputObject)]
pub struct TemperatureNotificationSortInput {
    /// Sort query result by `key`
    key: TemperatureNotificationSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct TemperatureNotificationFilterInput {
    pub acknowledged: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub struct TemperatureNotificationNode {
    pub temperature_breach: TemperatureBreach,
}

#[derive(SimpleObject)]
pub struct TemperatureNotificationConnector {
    total_count: u32,
    nodes: Vec<TemperatureNotificationNode>,
}

#[Object]
impl TemperatureNotificationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
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

    pub async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row().start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .end_datetime
            .map(|t| DateTime::<Utc>::from_utc(t, Utc))
    }

    pub async fn acknowledged(&self) -> bool {
        self.row().acknowledged
    }

    pub async fn duration_milliseconds(&self) -> i32 {
        self.row().duration_milliseconds
    }

    pub async fn r#type(&self) -> TemperatureNotificationNodeType {
        TemperatureNotificationNodeType::from_domain(&self.row().r#type)
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

    pub async fn max_or_min_temperature(&self, ctx: &Context<'_>) -> Result<Option<f64>> {
        Ok(get_max_or_min_breach_temperature(
            &ctx.get_connection_manager().connection()?,
            &self.row().id,
        )?)
    }
}

impl TemperatureNotificationNodeType {
    pub fn from_domain(from: &TemperatureBreachRowType) -> TemperatureNotificationNodeType {
        use TemperatureBreachRowType as from;
        use TemperatureNotificationNodeType as to;

        match from {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
        }
    }

    pub fn to_domain(self) -> TemperatureBreachRowType {
        use TemperatureBreachRowType as to;
        use TemperatureNotificationNodeType as from;

        match self {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
        }
    }
}

#[derive(Union)]
pub enum TemperatureNotificationsResponse {
    Response(TemperatureNotificationConnector),
}

#[derive(Union)]
pub enum TemperatureNotificationResponse {
    Error(NodeError),
    Response(TemperatureNotificationNode),
}

impl TemperatureNotificationNode {
    pub fn from_domain(temperature_breach: TemperatureBreach) -> TemperatureNotificationNode {
        TemperatureNotificationNode { temperature_breach }
    }

    pub fn row(&self) -> &TemperatureBreachRow {
        &self.temperature_breach.temperature_breach_row
    }
}

impl TemperatureNotificationConnector {
    pub fn from_domain(
        temperature_breaches: ListResult<TemperatureBreach>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            total_count: temperature_breaches.count,
            nodes: temperature_breaches
                .rows
                .into_iter()
                .map(TemperatureNotificationNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        temperature_breaches: Vec<TemperatureBreach>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            total_count: usize_to_u32(temperature_breaches.len()),
            nodes: temperature_breaches
                .into_iter()
                .map(TemperatureNotificationNode::from_domain)
                .collect(),
        }
    }
}

impl TemperatureNotificationSortInput {
    pub fn to_domain(self) -> TemperatureBreachSort {
        use TemperatureBreachSortField as to;
        use TemperatureNotificationSortFieldInput as from;
        let key = match self.key {
            from::StartDatetime => to::StartDatetime,
            from::EndDatetime => to::EndDatetime,
        };

        TemperatureBreachSort {
            key,
            desc: self.desc,
        }
    }
}
