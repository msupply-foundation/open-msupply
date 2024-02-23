use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{LocationByIdLoader, SensorByIdLoader},
    ContextExt,
};

use repository::{temperature_breach::TemperatureBreach, TemperatureExcursion};
use service::{usize_to_u32, ListResult};

use super::{LocationNode, SensorNode, TemperatureBreachConnector};

#[derive(PartialEq, Debug)]
pub struct TemperatureExcursionNode {
    pub temperature_excursion: TemperatureExcursion,
}

#[derive(SimpleObject)]
pub struct TemperatureExcursionConnector {
    total_count: u32,
    nodes: Vec<TemperatureExcursionNode>,
}

#[derive(SimpleObject)]
pub struct TemperatureNotificationConnector {
    breaches: TemperatureBreachConnector,
    excursions: TemperatureExcursionConnector,
}

#[Object]
impl TemperatureExcursionNode {
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
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().datetime, Utc)
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

    pub async fn max_or_min_temperature(&self) -> &f64 {
        &self.row().temperature
    }
}

#[derive(Union)]
pub enum TemperatureNotificationsResponse {
    Response(TemperatureNotificationConnector),
}

impl TemperatureExcursionNode {
    pub fn from_domain(temperature_excursion: TemperatureExcursion) -> TemperatureExcursionNode {
        TemperatureExcursionNode {
            temperature_excursion,
        }
    }

    pub fn row(&self) -> &TemperatureExcursion {
        &self.temperature_excursion
    }
}

impl TemperatureNotificationConnector {
    pub fn from_domain(
        temperature_breaches: ListResult<TemperatureBreach>,
        temperature_excursions: Vec<TemperatureExcursion>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: TemperatureBreachConnector::from_domain(temperature_breaches),
            excursions: TemperatureExcursionConnector {
                total_count: usize_to_u32(temperature_excursions.len()),
                nodes: temperature_excursions
                    .into_iter()
                    .map(TemperatureExcursionNode::from_domain)
                    .collect(),
            },
        }
    }

    pub fn from_vec(
        temperature_breaches: Vec<TemperatureBreach>,
        temperature_excursions: Vec<TemperatureExcursion>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: TemperatureBreachConnector::from_vec(temperature_breaches),
            excursions: TemperatureExcursionConnector {
                total_count: usize_to_u32(temperature_excursions.len()),
                nodes: temperature_excursions
                    .into_iter()
                    .map(TemperatureExcursionNode::from_domain)
                    .collect(),
            },
        }
    }
}
