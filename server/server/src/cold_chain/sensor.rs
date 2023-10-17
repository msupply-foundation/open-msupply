use actix_web::{
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use log::error;
use mime_guess::mime;
use regex::Regex;
use repository::{get_sensor_type, RepositoryError};
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
    log_interval: i32,
    #[serde(rename = "programmedDate")]
    programmed_date: usize,
    name: String,
    #[serde(rename = "logDelay")]
    log_delay: Option<i32>,
    #[serde(rename = "batteryLevel")]
    battery_level: i32,
}

pub async fn sensors(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    sensors: web::Json<Vec<Sensor>>,
) -> HttpResponse {
    let store_id = match validate_request(request, &service_provider, &auth_data) {
        Ok((_user, store_id)) => store_id,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            return HttpResponse::Unauthorized().body(formatted_error);
        }
    };
    let sensors = sensors.into_inner();
    if !validate_input(&sensors) {
        return HttpResponse::BadRequest().body("Expecting a body with the array of sensors");
    };

    match upsert_sensors(service_provider, store_id, &sensors).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    }
}

fn validate_input(sensors: &Vec<Sensor>) -> bool {
    sensors.into_iter().all(|sensor| validate_sensor(sensor))
}

fn validate_sensor(sensor: &Sensor) -> bool {
    let mac_regex = Regex::new(r"^([A-F0-9]{2}:){5}[A-F0-9]{2}( \| [\w]*)?$").unwrap();

    if !mac_regex.is_match(&sensor.mac_address) {
        return false;
    }
    if sensor.log_interval < 1 {
        return false;
    }
    if sensor.programmed_date < 1 {
        return false;
    }
    if sensor.name.len() < 1 {
        return false;
    }
    if sensor.battery_level < 1 || sensor.battery_level > 100 {
        return false;
    }
    match sensor.log_delay {
        Some(log_delay) => {
            if log_delay < 1 {
                return false;
            }
        }
        None => {}
    };
    true
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    store_id: Option<String>,
    sensors: &Vec<Sensor>,
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
                id: sensor.id.clone(),
                name: Some(sensor.name.clone()),
                is_active: Some(true),
                location_id: None,
                log_interval: Some(sensor.log_interval),
                battery_level: Some(sensor.battery_level),
            };
            match service.update_sensor(&ctx, sensor) {
                Ok(updated) => results.push(updated),
                Err(e) => error!("Unable to insert sensor: {:#?}", e),
            }
        } else {
            let sensor = InsertSensor {
                id: sensor.id.clone(),
                serial: sensor.mac_address.clone(),
                name: Some(sensor.name.clone()),
                is_active: Some(true),
                log_interval: Some(sensor.log_interval),
                battery_level: Some(sensor.battery_level),
                r#type: get_sensor_type(sensor.mac_address.clone()),
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
