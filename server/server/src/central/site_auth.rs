use actix_web::{http::header::AUTHORIZATION, HttpRequest, HttpResponse};
use serde::Serialize;
use service::apis::api_on_central::SiteAuth;

const HARDWARE_ID_HEADER: &str = "HardwareId";
const APP_VERSION_HEADER: &str = "appVersion";

pub fn extract_site_auth(req: &HttpRequest) -> Result<SiteAuth, &'static str> {
    let token = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or("Missing or incorrect Authorization header (expected `Bearer <token>`)")?
        .to_string();

    let hardware_id = req
        .headers()
        .get(HARDWARE_ID_HEADER)
        .and_then(|h| h.to_str().ok())
        .ok_or("Missing HardwareId header")?
        .to_string();

    let app_version = req
        .headers()
        .get(APP_VERSION_HEADER)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<u32>().ok())
        .ok_or("Missing or incorrect appVersion header (expected u32)")?;

    Ok(SiteAuth {
        token,
        hardware_id,
        app_version,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiResponse<T: Serialize> {
    Ok(T),
    Err(ApiError),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn unauthorized(message: impl Into<String>) -> Self {
        ApiResponse::Err(ApiError {
            code: "Unauthorized".to_string(),
            message: message.into(),
        })
    }

    pub fn internal(message: impl Into<String>) -> Self {
        ApiResponse::Err(ApiError {
            code: "Internal".to_string(),
            message: message.into(),
        })
    }
}

pub fn ok_json<T: Serialize>(response: ApiResponse<T>) -> HttpResponse {
    HttpResponse::Ok().json(response)
}
