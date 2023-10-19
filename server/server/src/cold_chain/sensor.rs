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
#[serde(rename_all = "camelCase")]
pub struct Sensor {
    id: String,
    mac_address: String,
    log_interval: i32,
    programmed_date: i32,
    name: String,
    log_delay: Option<i32>,
    battery_level: i32,
}

pub async fn put_sensors(
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
    match validate_input(&sensors) {
        Ok(_) => {}
        Err(error) => {
            return HttpResponse::BadRequest().body(format!(
                "The following sensors failed validation: \n{}",
                error
            ))
        }
    };

    match upsert_sensors(service_provider, store_id, sensors).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    }
}

fn validate_input(sensors: &Vec<Sensor>) -> Result<(), String> {
    let (_, errors): (Vec<_>, Vec<_>) = sensors
        .iter()
        .map(|sensor| validate_sensor(sensor))
        .partition(Result::is_ok);

    if errors.len() > 0 {
        let error = errors
            .into_iter()
            .map(Result::unwrap_err)
            .collect::<Vec<String>>()
            .join("\n");
        return Err(error);
    }
    Ok(())
}

fn validate_sensor(sensor: &Sensor) -> Result<(), String> {
    let mac_regex = Regex::new(r"^([A-F0-9]{2}:){5}[A-F0-9]{2}( \| [\w]*)?$").unwrap();

    if !mac_regex.is_match(&sensor.mac_address) {
        return Err(format!(" {}: Mac address is not valid", sensor.id));
    }
    if sensor.log_interval < 1 {
        return Err(format!(
            " {}: Log interval must be greater than zero",
            sensor.id
        ));
    }
    if sensor.programmed_date < 1 {
        return Err(format!(
            " {}: Programmed date must be greater than zero",
            sensor.id
        ));
    }
    if sensor.name.len() < 1 {
        return Err(format!(" {}: Sensor name must be specified", sensor.id));
    }
    if sensor.battery_level < 0 || sensor.battery_level > 100 {
        return Err(format!(
            " {}: Battery level must be between 0 and 100",
            sensor.id
        ));
    }
    match sensor.log_delay {
        Some(log_delay) => {
            if log_delay < 1 {
                return Err(format!(" {}: Log delay must be positive", sensor.id));
            }
        }
        None => {}
    };
    Ok(())
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    store_id: String,
    sensors: Vec<Sensor>,
) -> Result<HttpResponse, RepositoryError> {
    let mut ctx = service_provider.basic_context()?;
    ctx.store_id = store_id;
    let service = &service_provider.sensor_service;
    let results = sensors
        .iter()
        .map(|sensor| {
            let id = sensor.id.clone();
            match service.get_sensor(&ctx, id.clone()) {
                Ok(_) => {
                    let sensor = UpdateSensor {
                        id: id.clone(),
                        name: Some(sensor.name.clone()),
                        is_active: Some(true),
                        location_id: None,
                        log_interval: Some(sensor.log_interval),
                        battery_level: Some(sensor.battery_level),
                    };
                    match service.update_sensor(&ctx, sensor) {
                        Ok(updated) => Ok(updated),
                        Err(e) => {
                            error!("Unable to update sensor {}: {:#?}", &id, e);
                            Err(format!("Unable to update sensor {}: {:#?}", &id, e))
                        }
                    }
                }
                Err(_) => {
                    let sensor = InsertSensor {
                        r#type: get_sensor_type(&sensor.mac_address),
                        id: id.clone(),
                        serial: sensor.mac_address.clone(),
                        name: Some(sensor.name.clone()),
                        is_active: Some(true),
                        log_interval: Some(sensor.log_interval),
                        battery_level: Some(sensor.battery_level),
                    };
                    match service.insert_sensor(&ctx, sensor) {
                        Ok(inserted) => Ok(inserted),
                        Err(e) => {
                            error!("Unable to insert sensor {}: {:#?}", &id, e);
                            Err(format!("Unable to insert sensor {}: {:#?}", &id, e))
                        }
                    }
                }
            }
        })
        .collect::<Vec<Result<repository::Sensor, String>>>();

    Ok(HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .body(
            serde_json::to_string(&results).unwrap_or("Unable to deserialise results".to_string()),
        ))
}
