use actix_web::{
    post,
    web::{self, Data, Json},
    HttpResponse,
};

use crate::central_server_only;
use service::{
    apis::api_on_central::{self, CentralApiError, NameStoreJoinParams},
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
    service_provider: Data<ServiceProvider>,
    data: Json<NameStoreJoinParams>,
) -> HttpResponse {
    match api_on_central::patient_name_store_join(&service_provider, data.into_inner()).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(CentralApiError::NotAuthorized) => HttpResponse::Unauthorized()
            .body("Site credentials not authorized by legacy central server"),
        Err(error) => HttpResponse::InternalServerError().body(error.to_string()),
    }
}
