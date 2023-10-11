use actix_web::{
    guard,
    http::header,
    web::{self, Data},
    HttpResponse, Result,
};
use mime_guess::mime;
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
};

// Fixed login response time in case of an error (see service)
const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;

pub fn config_cold_chain(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/coldchain/v1/login")
            .guard(guard::Post())
            .to(login),
    );
}

async fn login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse> {
    let response = match do_login(user_info, service_provider, auth_data).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError().body(format!("{:#?}", error)),
    };

    Ok(response)
}

async fn do_login(
    user_info: web::Json<LoginRequest>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> Result<HttpResponse, RepositoryError> {
    let service_context = service_provider.basic_context()?;
    let sync_settings = service_provider
        .settings
        .sync_settings(&service_context)?
        .unwrap();
    let response = match LoginService::local_login(
        &service_provider,
        &auth_data,
        LoginInput {
            username: user_info.username.clone(),
            password: user_info.password.clone(),
            central_server_url: sync_settings.url.clone(),
        },
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        // TODO: validate user permission
        // TODO: create JWT and return cookie
        Ok(_) => HttpResponse::Ok()
            .append_header(header::ContentType(mime::APPLICATION_JSON))
            .body(
                r#"{
        "success": true
    }"#,
            ),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            HttpResponse::Unauthorized().body(formatted_error)
        }
    };

    Ok(response)
}

#[derive(serde::Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}
