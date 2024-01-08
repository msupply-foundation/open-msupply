use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{LocationByIdLoader, SensorByIdLoader},
    ContextExt,
};

use repository::{
    temperature_breach::TemperatureBreach, TemperatureExcursion, TemperatureExcursionRow,
};
use service::ListResult;

use super::{LocationNode, SensorNode, TemperatureBreachNode};

#[derive(PartialEq, Debug)]
pub struct TemperatureExcursionNode {
    pub temperature_excursion: TemperatureExcursion,
}

#[derive(SimpleObject)]
pub struct TemperatureNotificationConnector {
    breaches: Vec<TemperatureBreachNode>,
    excursions: Vec<TemperatureExcursionNode>,
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

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row().datetime, Utc)
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

    pub async fn temperature(&self) -> &f64 {
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

    pub fn row(&self) -> &TemperatureExcursionRow {
        &self.temperature_excursion.temperature_excursion_row
    }
}

impl TemperatureNotificationConnector {
    pub fn from_domain(
        temperature_breaches: ListResult<TemperatureBreach>,
        temperature_excursions: Vec<TemperatureExcursion>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: temperature_breaches
                .rows
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
            excursions: temperature_excursions
                .into_iter()
                .map(TemperatureExcursionNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        temperature_breaches: Vec<TemperatureBreach>,
        temperature_excursions: Vec<TemperatureExcursion>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: temperature_breaches
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
            excursions: temperature_excursions
                .into_iter()
                .map(TemperatureExcursionNode::from_domain)
                .collect(),
        }
    }
}
