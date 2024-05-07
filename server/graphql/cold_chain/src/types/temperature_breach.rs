use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::{LocationByIdLoader, SensorByIdLoader},
    map_filter,
    simple_generic_errors::NodeError,
    ContextExt,
};

use graphql_types::types::{LocationFilterInput, LocationNode};
use repository::{
    temperature_breach::{
        TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort,
        TemperatureBreachSortField,
    },
    DatetimeFilter, EqualFilter, TemperatureBreachRow, TemperatureBreachType,
};
use service::{
    cold_chain::query_temperature_breach::get_max_or_min_breach_temperature, usize_to_u32,
    ListResult,
};

use super::sensor::{SensorFilterInput, SensorNode};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum TemperatureBreachNodeType {
    ColdConsecutive,
    ColdCumulative,
    HotConsecutive,
    HotCumulative,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum TemperatureBreachSortFieldInput {
    StartDatetime,
    EndDatetime,
}

#[derive(InputObject)]
pub struct TemperatureBreachSortInput {
    /// Sort query result by `key`
    key: TemperatureBreachSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterTemperatureBreachRowTypeInput {
    pub equal_to: Option<TemperatureBreachNodeType>,
    pub equal_any: Option<Vec<TemperatureBreachNodeType>>,
    pub not_equal_to: Option<TemperatureBreachNodeType>,
}

#[derive(InputObject, Clone)]
pub struct TemperatureBreachFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub start_datetime: Option<DatetimeFilterInput>,
    pub end_datetime: Option<DatetimeFilterInput>,
    pub r#type: Option<EqualFilterTemperatureBreachRowTypeInput>,
    pub unacknowledged: Option<bool>,
    pub sensor: Option<SensorFilterInput>,
    pub location: Option<LocationFilterInput>,
}

impl From<TemperatureBreachFilterInput> for TemperatureBreachFilter {
    fn from(f: TemperatureBreachFilterInput) -> Self {
        TemperatureBreachFilter {
            unacknowledged: f.unacknowledged,
            r#type: f
                .r#type
                .map(|t| map_filter!(t, TemperatureBreachNodeType::to_domain)),
            id: f.id.map(EqualFilter::from),
            start_datetime: f.start_datetime.map(DatetimeFilter::from),
            end_datetime: f.end_datetime.map(DatetimeFilter::from),
            store_id: None,
            sensor: f.sensor.map(SensorFilterInput::into),
            location: f.location.map(LocationFilterInput::into),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct TemperatureBreachNode {
    pub temperature_breach: TemperatureBreach,
}

#[derive(SimpleObject)]
pub struct TemperatureBreachConnector {
    total_count: u32,
    nodes: Vec<TemperatureBreachNode>,
}

#[Object]
impl TemperatureBreachNode {
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
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .end_datetime
            .map(|t| DateTime::<Utc>::from_naive_utc_and_offset(t, Utc))
    }

    pub async fn unacknowledged(&self) -> bool {
        self.row().unacknowledged
    }

    pub async fn duration_milliseconds(&self) -> i32 {
        self.row().duration_milliseconds
    }

    pub async fn r#type(&self) -> TemperatureBreachNodeType {
        TemperatureBreachNodeType::from_domain(&self.row().r#type)
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

    pub async fn comment(&self) -> Option<String> {
        self.row().comment.clone()
    }
}

impl TemperatureBreachNodeType {
    pub fn from_domain(from: &TemperatureBreachType) -> TemperatureBreachNodeType {
        use TemperatureBreachNodeType as to;
        use TemperatureBreachType as from;

        match from {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
            from::Excursion => {
                panic!("Excursion is not a valid type for TemperatureBreachNodeType")
            }
        }
    }

    pub fn to_domain(self) -> TemperatureBreachType {
        use TemperatureBreachNodeType as from;
        use TemperatureBreachType as to;

        match self {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
        }
    }
}

#[derive(Union)]
pub enum TemperatureBreachesResponse {
    Response(TemperatureBreachConnector),
}

#[derive(Union)]
pub enum TemperatureBreachResponse {
    Error(NodeError),
    Response(TemperatureBreachNode),
}

impl TemperatureBreachNode {
    pub fn from_domain(temperature_breach: TemperatureBreach) -> TemperatureBreachNode {
        TemperatureBreachNode { temperature_breach }
    }

    pub fn row(&self) -> &TemperatureBreachRow {
        &self.temperature_breach.temperature_breach_row
    }
}

impl TemperatureBreachConnector {
    pub fn from_domain(
        temperature_breaches: ListResult<TemperatureBreach>,
    ) -> TemperatureBreachConnector {
        TemperatureBreachConnector {
            total_count: temperature_breaches.count,
            nodes: temperature_breaches
                .rows
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(temperature_breaches: Vec<TemperatureBreach>) -> TemperatureBreachConnector {
        TemperatureBreachConnector {
            total_count: usize_to_u32(temperature_breaches.len()),
            nodes: temperature_breaches
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
        }
    }
}

impl TemperatureBreachSortInput {
    pub fn to_domain(self) -> TemperatureBreachSort {
        use TemperatureBreachSortField as to;
        use TemperatureBreachSortFieldInput as from;
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
