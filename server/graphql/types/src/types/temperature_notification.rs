use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use graphql_core::{
    loader::{LocationByIdLoader, SensorByIdLoader},
    ContextExt,
};

use repository::{temperature_breach::TemperatureBreach, TemperatureBreachRow};
use service::{temperature_breach::query::get_max_or_min_breach_temperature, ListResult};

use super::{LocationNode, SensorNode, TemperatureBreachNode};

#[derive(PartialEq, Debug)]
pub struct TemperatureExcursionNode {
    pub temperature_excursion: TemperatureBreach,
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

    pub async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row().start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .end_datetime
            .map(|t| DateTime::<Utc>::from_utc(t, Utc))
    }

    pub async fn duration_milliseconds(&self) -> i32 {
        self.row().duration_milliseconds
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

#[derive(Union)]
pub enum TemperatureNotificationsResponse {
    Response(TemperatureNotificationConnector),
}

impl TemperatureExcursionNode {
    pub fn from_domain(temperature_excursion: TemperatureBreach) -> TemperatureExcursionNode {
        TemperatureExcursionNode {
            temperature_excursion,
        }
    }

    pub fn row(&self) -> &TemperatureBreachRow {
        &self.temperature_excursion.temperature_breach_row
    }
}

impl TemperatureNotificationConnector {
    pub fn from_domain(
        temperature_breaches: ListResult<TemperatureBreach>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: temperature_breaches
                .rows
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
            excursions: Vec::new(),
        }
    }

    pub fn from_vec(
        temperature_breaches: Vec<TemperatureBreach>,
    ) -> TemperatureNotificationConnector {
        TemperatureNotificationConnector {
            breaches: temperature_breaches
                .into_iter()
                .map(TemperatureBreachNode::from_domain)
                .collect(),
            excursions: Vec::new(),
        }
    }
}
