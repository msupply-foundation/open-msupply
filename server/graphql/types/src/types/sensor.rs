use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::simple_generic_errors::NodeError;
use repository::{
    sensor::{Sensor, SensorFilter, SensorSort, SensorSortField},
    EqualFilter, SensorRow,
};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SensorSortFieldInput {
    Serial,
    Name,
}
#[derive(InputObject)]
pub struct SensorSortInput {
    /// Sort query result by `key`
    key: SensorSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct SensorFilterInput {
    pub serial: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
    pub is_active: Option<bool>,
    pub id: Option<EqualFilterStringInput>,
}

impl From<SensorFilterInput> for SensorFilter {
    fn from(f: SensorFilterInput) -> Self {
        SensorFilter {
            serial: f.serial.map(EqualFilter::from),
            name: f.name.map(EqualFilter::from),
            id: f.id.map(EqualFilter::from),
            store_id: None,
            is_active: f.is_active,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct SensorNode {
    pub sensor: Sensor,
}

#[derive(SimpleObject)]
pub struct SensorConnector {
    total_count: u32,
    nodes: Vec<SensorNode>,
}

#[Object]
impl SensorNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn serial(&self) -> &str {
        &self.row().serial
    }

    pub async fn is_active(&self) -> bool {
        self.row().is_active
    }
}

#[derive(Union)]
pub enum SensorsResponse {
    Response(SensorConnector),
}

#[derive(Union)]
pub enum SensorResponse {
    Error(NodeError),
    Response(SensorNode),
}

impl SensorNode {
    pub fn from_domain(sensor: Sensor) -> SensorNode {
        SensorNode { sensor }
    }

    pub fn row(&self) -> &SensorRow {
        &self.sensor.sensor_row
    }
}

impl SensorConnector {
    pub fn from_domain(sensors: ListResult<Sensor>) -> SensorConnector {
        SensorConnector {
            total_count: sensors.count,
            nodes: sensors
                .rows
                .into_iter()
                .map(SensorNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(sensors: Vec<Sensor>) -> SensorConnector {
        SensorConnector {
            total_count: usize_to_u32(sensors.len()),
            nodes: sensors.into_iter().map(SensorNode::from_domain).collect(),
        }
    }
}

impl SensorSortInput {
    pub fn to_domain(self) -> SensorSort {
        use SensorSortField as to;
        use SensorSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Serial => to::Serial,
        };

        SensorSort {
            key,
            desc: self.desc,
        }
    }
}
