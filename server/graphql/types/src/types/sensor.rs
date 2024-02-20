use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::generic_filters::StringFilterInput;
use graphql_core::simple_generic_errors::NodeError;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_core::{generic_filters::EqualFilterStringInput, loader::LocationByIdLoader};
use repository::{
    DatetimeFilter, PaginationOption, SensorType, StringFilter, TemperatureBreachFilter,
    TemperatureLogFilter, TemperatureLogSort, TemperatureLogSortField,
};
use repository::{EqualFilter, Sensor, SensorFilter, SensorRow, SensorSort, SensorSortField};
use service::temperature_breach::query::temperature_breaches;
use service::temperature_log::query::get_temperature_logs;
use service::{usize_to_u32, ListResult};

use super::{LocationNode, TemperatureBreachNodeType, TemperatureLogConnector};

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
    pub name: Option<StringFilterInput>,
    pub is_active: Option<bool>,
    pub id: Option<EqualFilterStringInput>,
}

impl From<SensorFilterInput> for SensorFilter {
    fn from(f: SensorFilterInput) -> Self {
        SensorFilter {
            serial: f.serial.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
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

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum SensorNodeType {
    BlueMaestro,
    Laird,
    Berlinger,
}

#[Object]
impl SensorNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn serial(&self) -> String {
        // the serial is stored as `| SENSOR_MANUFACTURER` in the database
        // and the front end does not want to know about the manufacturer
        let re = regex::Regex::new(r"\| .+$").unwrap();

        re.replace(&self.row().serial, "").to_string()
    }

    pub async fn r#type(&self) -> SensorNodeType {
        SensorNodeType::from_domain(&self.row().r#type)
    }

    pub async fn is_active(&self) -> bool {
        self.row().is_active
    }

    pub async fn battery_level(&self) -> Option<i32> {
        self.row().battery_level
    }

    pub async fn log_interval(&self) -> Option<i32> {
        self.row().log_interval
    }

    pub async fn last_connection_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .last_connection_datetime
            .map(|datetime| DateTime::<Utc>::from_naive_utc_and_offset(datetime, Utc))
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

    pub async fn latest_temperature_log(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<TemperatureLogConnector>> {
        let filter = TemperatureLogFilter::new()
            .sensor(SensorFilter::new().id(EqualFilter::equal_to(&self.row().id)));

        let latest_log = get_temperature_logs(
            &ctx.get_connection_manager().connection()?,
            Some(PaginationOption {
                limit: Some(1),
                offset: None,
            }),
            Some(filter),
            Some(TemperatureLogSort {
                key: TemperatureLogSortField::Datetime,
                desc: Some(true),
            }),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(Some(TemperatureLogConnector::from_domain(latest_log)))
    }

    pub async fn breach(&self, ctx: &Context<'_>) -> Result<Option<TemperatureBreachNodeType>> {
        let filter = TemperatureBreachFilter::new()
            .end_datetime(DatetimeFilter::is_null(true))
            .sensor(SensorFilter::new().id(EqualFilter::equal_to(&self.row().id)));

        let breach = temperature_breaches(
            &ctx.get_connection_manager().connection()?,
            Some(PaginationOption {
                limit: Some(1),
                offset: None,
            }),
            Some(filter),
            None,
        )
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(breach.rows.into_iter().next().map(|breach| {
            TemperatureBreachNodeType::from_domain(&breach.temperature_breach_row.r#type)
        }))
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

impl SensorNodeType {
    pub fn from_domain(from: &SensorType) -> SensorNodeType {
        use SensorNodeType as to;
        use SensorType as from;

        match from {
            from::BlueMaestro => to::BlueMaestro,
            from::Laird => to::Laird,
            from::Berlinger => to::Berlinger,
        }
    }

    pub fn to_domain(self) -> SensorType {
        use SensorNodeType as from;
        use SensorType as to;

        match self {
            from::BlueMaestro => to::BlueMaestro,
            from::Laird => to::Laird,
            from::Berlinger => to::Berlinger,
        }
    }
}
