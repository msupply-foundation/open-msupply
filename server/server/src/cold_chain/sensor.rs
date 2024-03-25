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
    service_provider::{ServiceContext, ServiceProvider},
    SingleRecordError,
};
use util::constants::SYSTEM_USER_ID;

use super::validate_request;

#[derive(serde::Deserialize, Debug, Clone)]
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

    let results = match upsert_sensors(service_provider, store_id, sensors).await {
        Ok(response) => response,
        Err(error) => return HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    };

    for result in &results {
        if let Err(e) = result {
            error!("Error upserting sensors {:#?}", e);
            return HttpResponse::InternalServerError().body(format!("{:#?}", e));
        }
    }

    HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .json(&results)
}

fn validate_input(sensors: &[Sensor]) -> Result<(), String> {
    let (_, errors): (Vec<_>, Vec<_>) =
        sensors.iter().map(validate_sensor).partition(Result::is_ok);

    if !errors.is_empty() {
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
    if sensor.name.is_empty() {
        return Err(format!(" {}: Sensor name must be specified", sensor.id));
    }
    if sensor.battery_level < 0 || sensor.battery_level > 100 {
        return Err(format!(
            " {}: Battery level must be between 0 and 100",
            sensor.id
        ));
    }
    if let Some(log_delay) = sensor.log_delay {
        if log_delay < 0 {
            return Err(format!(" {}: Log delay must be positive", sensor.id));
        }
    }

    Ok(())
}

async fn upsert_sensors(
    service_provider: Data<ServiceProvider>,
    store_id: String,
    sensors: Vec<Sensor>,
) -> Result<Vec<Result<repository::Sensor, String>>, RepositoryError> {
    let ctx = service_provider.context(store_id, SYSTEM_USER_ID.to_string())?;
    let results = sensors
        .iter()
        .map(|sensor| {
            upsert_sensor(&service_provider, &ctx, sensor.clone()).map_err(|e| {
                error!("{:#?} {:?}", e, sensor);
                e.to_string()
            })
        })
        .collect();

    Ok(results)
}

fn upsert_sensor(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    sensor: Sensor,
) -> anyhow::Result<repository::Sensor> {
    let service = &service_provider.sensor_service;
    let id = sensor.id.clone();

    let result = match service.get_sensor(ctx, id.clone()) {
        Ok(_) => {
            let sensor = UpdateSensor {
                id: id.clone(),
                name: Some(sensor.name.clone()),
                is_active: None,
                location_id: None,
                log_interval: Some(sensor.log_interval),
                battery_level: Some(sensor.battery_level),
            };
            service
                .update_sensor(ctx, sensor)
                .map_err(|e| anyhow::anyhow!("Unable to update sensor {}. {:?}", &id, e))?
        }
        Err(SingleRecordError::NotFound(_)) => {
            let sensor = InsertSensor {
                r#type: get_sensor_type(&sensor.mac_address),
                id: id.clone(),
                serial: sensor.mac_address.clone(),
                name: Some(sensor.name.clone()),
                is_active: Some(true),
                log_interval: Some(sensor.log_interval),
                battery_level: Some(sensor.battery_level),
            };
            service
                .insert_sensor(ctx, sensor)
                .map_err(|e| anyhow::anyhow!("Unable to insert sensor {}. {:?}", &id, e))?
        }
        Err(e) => return Err(anyhow::anyhow!("Unable to get sensor {}. {:?}", &id, e)),
    };
    Ok(result)
}
