use actix_web::{
    http::header::HeaderValue,
    post,
    web::{self, Data, Json},
    HttpRequest, HttpResponse,
};
use base64::{prelude::BASE64_STANDARD, Engine};

use crate::central_server_only;
use service::{
    apis::api_on_central::{self, CentralApiError, NameStoreJoinParams, SiteAuth},
    service_provider::ServiceProvider,
};

pub fn config_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(patient_name_store_join),
    );
}

#[post("/name-store-join")]
async fn patient_name_store_join(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    data: Json<NameStoreJoinParams>,
) -> HttpResponse {
    let basic_auth_header = request.headers().get("authorization");
    let auth = match parse_basic_auth_header(basic_auth_header) {
        Some((user, pass)) => SiteAuth {
            username: user,
            password_sha256: pass,
        },
        None => {
            return HttpResponse::Unauthorized().body("Couldn't parse auth header");
        }
    };

    match api_on_central::patient_name_store_join(&service_provider, data.into_inner(), auth).await
    {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(CentralApiError::NotAuthorized) => HttpResponse::Unauthorized()
            .body("Site credentials not authorized by legacy central server"),
        Err(error) => HttpResponse::InternalServerError().body(error.to_string()),
    }
}

fn parse_basic_auth_header(header: Option<&HeaderValue>) -> Option<(String, String)> {
    let header_value = header.and_then(|v| v.to_str().ok())?;
    let encoded = header_value.strip_prefix("Basic ")?;
    let decoded = BASE64_STANDARD.decode(encoded).ok()?;
    let credentials = String::from_utf8(decoded).ok()?;
    let mut parts = credentials.splitn(2, ':');

    Some((parts.next()?.to_string(), parts.next()?.to_string()))
}
