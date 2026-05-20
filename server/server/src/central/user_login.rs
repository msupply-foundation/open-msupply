use actix_web::{
    dev::HttpServiceFactory,
    post,
    web::{self, Data, Json},
    HttpResponse,
};
use serde::{Deserialize, Serialize};
use service::{
    login::{LoginService, MIN_ERR_RESPONSE_TIME_SEC},
    service_provider::ServiceProvider,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserLoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserLoginResponse {
    pub success: bool,
}

pub fn user_on_central() -> impl HttpServiceFactory {
    web::scope("user").service(login)
}

#[post("/login")]
async fn login(
    input: Json<UserLoginInput>,
    service_provider: Data<ServiceProvider>,
) -> HttpResponse {
    let UserLoginInput { username, password } = input.into_inner();
    match LoginService::verify_credentials_on_central(
        &service_provider,
        &username,
        &password,
        MIN_ERR_RESPONSE_TIME_SEC,
    )
    .await
    {
        Ok(true) => HttpResponse::Ok().json(UserLoginResponse { success: true }),
        Ok(false) => HttpResponse::Unauthorized().json(UserLoginResponse { success: false }),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}
