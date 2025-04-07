use actix_web::{
    post,
    web::{Data, Json},
    HttpResponse,
};

use service::{
    apis::api_on_central::{self, CentralApiError, NameStoreJoinParams},
    service_provider::ServiceProvider,
};

#[post("/name-store-join")]
pub async fn patient_name_store_join(
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
