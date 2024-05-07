use actix_web::{
    http::header,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use anyhow::Context;
use chrono::NaiveDateTime;
use log::error;
use mime_guess::mime;
use repository::RepositoryError;
use service::cold_chain::insert_temperature_breach::InsertTemperatureBreach;
use service::{
    auth_data::AuthData,
    cold_chain::{
        insert_temperature_log::InsertTemperatureLog, update_temperature_log::UpdateTemperatureLog,
    },
    service_provider::{ServiceContext, ServiceProvider},
    SingleRecordError,
};
use util::constants::SYSTEM_USER_ID;

use super::validate_request;

#[derive(serde::Deserialize, Debug, Clone)]
pub struct TemperatureLog {
    id: String,
    temperature: f64,
    #[serde(rename = "timestamp")]
    unix_timestamp: i64,
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

    let results = match upsert_temperature_logs(service_provider, store_id, logs).await {
        Ok(response) => response,
        Err(error) => {
            error!("Error inserting temperature logs {:#?}", error);
            return HttpResponse::InternalServerError().body(format!("{:#?}", error));
        }
    };

    for result in &results {
        if let Err(e) = result {
            error!("Error inserting temperature log {:#?}", e);
            return HttpResponse::InternalServerError().body(format!("{:#?}", e));
        }
    }

    HttpResponse::Ok()
        .append_header(header::ContentType(mime::APPLICATION_JSON))
        .json(&results)
}

fn validate_input(logs: &[TemperatureLog]) -> bool {
    logs.iter().all(validate_log)
}

fn validate_log(log: &TemperatureLog) -> bool {
    if log.unix_timestamp < 1 {
        return false;
    }
    true
}

async fn upsert_temperature_logs(
    service_provider: Data<ServiceProvider>,
    store_id: String,
    logs: Vec<TemperatureLog>,
) -> Result<Vec<Result<repository::TemperatureLog, String>>, RepositoryError> {
    let ctx = service_provider.context(store_id, SYSTEM_USER_ID.to_string())?;
    let results = logs
        .into_iter()
        .map(|log| {
            upsert_temperature_log(&service_provider, &ctx, log.clone()).map_err(|e| {
                error!("{:#?} {:?}", e, log);
                e.to_string()
            })
        })
        .collect();

    Ok(results)
}

fn upsert_temperature_log(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    log: TemperatureLog,
) -> anyhow::Result<repository::TemperatureLog> {
    let id = log.id.clone();
    let service = &service_provider.cold_chain_service;
    let sensor_service = &service_provider.sensor_service;
    let sensor = sensor_service
        .get_sensor(ctx, log.sensor_id.clone())
        .map_err(|e| anyhow::anyhow!("Unable to get sensor {:?}", e))?;
    let datetime = NaiveDateTime::from_timestamp_opt(log.unix_timestamp, 0)
        .context(format!("Unable to parse timestamp {}", log.unix_timestamp))?;

    // If we have a temperature log with a breachid, we need to make sure the breach exists first, if it doesn't we create a temporary record so we don't loose data.
    match &log.temperature_breach_id {
        Some(breach_id) => {
            let breach = service_provider
                .cold_chain_service
                .get_temperature_breach(ctx, breach_id.clone());

            match breach {
                Ok(_) => {}
                Err(SingleRecordError::NotFound(_)) => {
                    // Create a temperature breach record as it doesn't exist yet
                    let breach = InsertTemperatureBreach {
                        id: breach_id.clone(),
                        sensor_id: log.sensor_id.clone(),
                        threshold_duration_milliseconds: 0,
                        duration_milliseconds: 0,
                        r#type: repository::TemperatureBreachType::HotConsecutive,
                        start_datetime: NaiveDateTime::from_timestamp_millis(log.unix_timestamp)
                            .unwrap_or_default(),
                        end_datetime: None,
                        unacknowledged: true,
                        threshold_minimum: 0.0,
                        threshold_maximum: 0.0,
                        comment: None,
                        location_id: None,
                    };
                    service_provider
                        .cold_chain_service
                        .insert_temperature_breach(ctx, breach)
                        .map_err(|e| {
                            anyhow::anyhow!("Unable to insert temperature breach {:?}", e)
                        })?;
                }
                Err(e) => {
                    return Err(anyhow::anyhow!(
                        "Unable to get temperature breach for id '{}'. {:#?}",
                        breach_id.clone(),
                        e
                    ));
                }
            }
        }
        None => {}
    };

    let result = match service.get_temperature_log(ctx, id.clone()) {
        Ok(_) => {
            let log = UpdateTemperatureLog {
                id: id.clone(),
                datetime,
                location_id: sensor.sensor_row.location_id,
                sensor_id: sensor.sensor_row.id,
                temperature: log.temperature,
                temperature_breach_id: log.temperature_breach_id.clone(),
            };
            service
                .update_temperature_log(ctx, log)
                .map_err(|e| anyhow::anyhow!("Unable to update temperature log {:?}", e))?
        }
        Err(SingleRecordError::NotFound(_)) => {
            let log = InsertTemperatureLog {
                id: id.clone(),
                datetime,
                location_id: sensor.sensor_row.location_id,
                sensor_id: sensor.sensor_row.id,
                temperature: log.temperature,
                temperature_breach_id: log.temperature_breach_id.clone(),
            };
            service
                .insert_temperature_log(ctx, log)
                .map_err(|e| anyhow::anyhow!("Unable to insert temperature log {:?}", e))?
        }
        Err(e) => {
            return Err(anyhow::anyhow!(
                "Unable to get temperature log for id '{}'. {:#?}",
                id.clone(),
                e
            ))
        }
    };

    Ok(result)
}
