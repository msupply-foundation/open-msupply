use actix_web::{
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use log::error;
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    sensor::{insert::InsertSensor, update::UpdateSensor},
    service_provider::ServiceProvider,
};

use super::validate_request;

#[derive(serde::Deserialize)]
pub struct Sensor {
    id: String,
    #[serde(rename = "macAddress")]
    mac_address: String,
    #[serde(rename = "logInterval")]
    log_interval: u32,
    #[serde(rename = "programmedDate")]
    programmed_date: usize,
    name: String,
    #[serde(rename = "logDelay")]
    log_delay: Option<u32>,
    #[serde(rename = "batteryLevel")]
    battery_level: u32,
}

pub async fn sensors(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    sensors: web::Json<Vec<Sensor>>,
) -> HttpResponse {
    match validate_request(request, &service_provider, &auth_data) {
        Ok((_user, store_id)) => {
            match upsert_sensors(service_provider, store_id, sensors.into_inner()).await {
                Ok(response) => response,
                Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
            }
        }
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            HttpResponse::Unauthorized().body(formatted_error)
        }
    }
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    store_id: Option<String>,
    sensors: Vec<Sensor>,
) -> Result<HttpResponse, RepositoryError> {
    let mut ctx = service_provider.basic_context()?;
    if store_id.is_some() {
        ctx.store_id = store_id.unwrap();
    }
    let service = &service_provider.sensor_service;

    let mut results: Vec<repository::Sensor> = Vec::new();
    sensors.into_iter().for_each(|sensor| {
        if service.get_sensor(&ctx, sensor.id.clone()).is_ok() {
            let sensor = UpdateSensor {
                id: sensor.id,
                name: Some(sensor.name),
                is_active: Some(true),
                location_id: None,
            };
            match service.update_sensor(&ctx, sensor) {
                Ok(updated) => results.push(updated),
                Err(e) => error!("Unable to insert sensor: {:#?}", e),
            }
        } else {
            let sensor = InsertSensor {
                id: sensor.id,
                serial: sensor.mac_address,
                name: Some(sensor.name),
                is_active: Some(true),
            };
            match service.insert_sensor(&ctx, sensor) {
                Ok(inserted) => results.push(inserted),
                Err(e) => error!("Unable to update sensor: {:#?}", e),
            }
        }
    });

    Ok(HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .body(
            serde_json::to_string(&results).unwrap_or("Unable to deserialise results".to_string()),
        ))
}
