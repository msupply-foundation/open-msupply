use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::generic_filters::{DatetimeFilterInput, EqualFilterStringInput};
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::map_filter;

use repository::{
    temperature_breach::{TemperatureBreach, TemperatureBreachFilter, TemperatureBreachSort, TemperatureBreachSortField},
    DatetimeFilter, EqualFilter, TemperatureBreachRow, TemperatureBreachRowType,
};
use service::{usize_to_u32, ListResult};

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
    StartTimestamp,
    EndTimestamp,
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
    pub sensor_id: Option<EqualFilterStringInput>,
    //pub location_id: Option<EqualFilterStringInput>,
    pub start_timestamp: Option<DatetimeFilterInput>,
    pub end_timestamp: Option<DatetimeFilterInput>,
    //pub r#type: Option<EqualFilterTemperatureBreachRowTypeInput>,
    pub acknowledged: Option<bool>,
}

impl From<TemperatureBreachFilterInput> for TemperatureBreachFilter {
    fn from(f: TemperatureBreachFilterInput) -> Self {
        TemperatureBreachFilter {
            sensor_id: f.sensor_id.map(EqualFilter::from),
            //location_id: f.location_id.map(EqualFilter::from),
            acknowledged: f.acknowledged,
            //r#type: f
            //    .r#type
            //    .map(|t| map_filter!(t, TemperatureBreachNodeType::to_domain)),
            id: f.id.map(EqualFilter::from),
            start_timestamp: f.start_timestamp.map(DatetimeFilter::from),
            end_timestamp: f.end_timestamp.map(DatetimeFilter::from),
            store_id: None,
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

    //pub async fn location_id(&self) -> &str {
    //    &self.row().location_id
    //}

    pub async fn start_timestamp(&self) -> NaiveDateTime {
        self.row().start_timestamp
    }

    pub async fn end_timestamp(&self) -> NaiveDateTime {
        self.row().end_timestamp
    }

    pub async fn acknowledged(&self) -> bool {
        self.row().acknowledged
    }

    //pub async fn duration(&self) -> i32 {
    //    self.row().duration
    //}

    //pub async fn r#type(&self) -> TemperatureBreachNodeType {
    //    TemperatureBreachNodeType::from_domain(&self.row().r#type)
    //}
}

impl TemperatureBreachNodeType {
    pub fn from_domain(from: &TemperatureBreachRowType) -> TemperatureBreachNodeType {
        use TemperatureBreachNodeType as to;
        use TemperatureBreachRowType as from;

        match from {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
        }
    }

    pub fn to_domain(self) -> TemperatureBreachRowType {
        use TemperatureBreachNodeType as from;
        use TemperatureBreachRowType as to;

        match self {
            from::ColdConsecutive => to::ColdConsecutive,
            from::ColdCumulative => to::ColdCumulative,
            from::HotConsecutive => to::HotConsecutive,
            from::HotCumulative => to::HotCumulative,
        }
    }
}

#[derive(Union)]
pub enum TemperatureBreachsResponse {
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
    pub fn from_domain(temperature_breachs: ListResult<TemperatureBreach>) -> TemperatureBreachConnector {
        TemperatureBreachConnector {
            total_count: temperature_breachs.count,
            nodes: temperature_breachs
                .rows
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(temperature_breachs: Vec<TemperatureBreach>) -> TemperatureBreachConnector {
        TemperatureBreachConnector {
            total_count: usize_to_u32(temperature_breachs.len()),
            nodes: temperature_breachs.into_iter().map(TemperatureBreachNode::from_domain).collect(),
        }
    }
}

impl TemperatureBreachSortInput {
    pub fn to_domain(self) -> TemperatureBreachSort {
        use TemperatureBreachSortField as to;
        use TemperatureBreachSortFieldInput as from;
        let key = match self.key {
            from::StartTimestamp => to::StartTimestamp,
            from::EndTimestamp => to::EndTimestamp,
        };

        TemperatureBreachSort {
            key,
            desc: self.desc,
        }
    }
}
