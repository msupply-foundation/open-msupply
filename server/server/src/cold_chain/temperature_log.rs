use actix_web::{
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use chrono::NaiveDateTime;
use log::error;
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    service_provider::ServiceProvider,
    temperature_log::{insert::InsertTemperatureLog, update::UpdateTemperatureLog},
};

use super::validate_request;

#[derive(serde::Deserialize)]
pub struct TemperatureLog {
    id: String,
    temperature: f64,
    timestamp: i64,
    #[serde(rename = "sensorId")]
    sensor_id: String,
    #[serde(rename = "temperatureBreachId")]
    pub temperature_breach_id: Option<String>,
}

pub async fn put_logs(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    logs: web::Json<Vec<TemperatureLog>>,
) -> HttpResponse {
    let store_id = match validate_request(request, &service_provider, &auth_data) {
        Ok((_user, store_id)) => store_id,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            return HttpResponse::Unauthorized().body(formatted_error);
        }
    };
    let logs = logs.into_inner();
    if !validate_input(&logs) {
        return HttpResponse::BadRequest()
            .body("Expecting a body with the array of temperature logs");
    };

    let results = match upsert_temperature_logs(service_provider, store_id, &logs).await {
        Ok(response) => response,
        Err(error) => return HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    };

    HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .json(&results)
}

fn validate_input(logs: &Vec<TemperatureLog>) -> bool {
    logs.iter().all(|log| validate_log(log))
}

fn validate_log(log: &TemperatureLog) -> bool {
    if log.timestamp < 1 {
        return false;
    }
    true
}

async fn upsert_temperature_logs(
    service_provider: Data<ServiceProvider>,
    store_id: String,
    logs: &Vec<TemperatureLog>,
) -> Result<Vec<Result<repository::TemperatureLog, String>>, RepositoryError> {
    let mut ctx = service_provider.basic_context()?;
    ctx.store_id = store_id;
    let service = &service_provider.temperature_log_service;

    let results = logs
        .iter()
        .map(|log| {
            let id = log.id.clone();
            let datetime = match NaiveDateTime::from_timestamp_opt(log.timestamp, 0) {
                Some(datetime) => datetime,
                None => {
                    error!(
                        "Unable to parse timestamp for log {}: {}",
                        log.id, log.timestamp
                    );
                    return Err(format!(
                        "Unable to parse timestamp for log {}: {}",
                        log.id, log.timestamp
                    ));
                }
            };
            match service.get_temperature_log(&ctx, log.id.clone()) {
                Ok(_) => {
                    let log = UpdateTemperatureLog {
                        id: id.clone(),
                        datetime,
                        location_id: None,
                        sensor_id: log.sensor_id.clone(),
                        temperature: log.temperature,
                        temperature_breach_id: log.temperature_breach_id.clone(),
                    };
                    match service.update_temperature_log(&ctx, log) {
                        Ok(updated) => Ok(updated),
                        Err(e) => {
                            error!("Unable to insert temperature log {}: {:#?}", id.clone(), e);
                            Err(format!(
                                "Unable to insert temperature log {}: {:#?}",
                                id.clone(),
                                e
                            ))
                        }
                    }
                }
                Err(_) => {
                    let log = InsertTemperatureLog {
                        id: id.clone(),
                        datetime,
                        location_id: None,
                        sensor_id: log.sensor_id.clone(),
                        temperature: log.temperature,
                        temperature_breach_id: log.temperature_breach_id.clone(),
                    };
                    match service.insert_temperature_log(&ctx, log) {
                        Ok(inserted) => Ok(inserted),
                        Err(e) => {
                            error!("Unable to update temperature log {}: {:#?}", id.clone(), e);
                            Err(format!(
                                "Unable to update temperature log {}: {:#?}",
                                id.clone(),
                                e
                            ))
                        }
                    }
                }
            }
        })
        .collect::<Vec<Result<repository::TemperatureLog, String>>>();

    Ok(results)
}
