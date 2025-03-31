use actix_web::{
    post,
    web::{self, Data, Json},
    HttpResponse,
};

use crate::central_server_only;
use service::{
    apis::api_on_central::{self, NameStoreJoinParams},
    auth::validate_auth,
    auth_data::AuthData,
    service_provider::ServiceProvider,
};

pub fn config_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(patient_name_store_join),
    );
}

// todo auth ? cookie?
#[post("/name-store-join")]
async fn patient_name_store_join(
    request: Json<NameStoreJoinParams>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    // or maybe just validate_auth??
    // let auth_result = validate_cookie_auth(request.clone(), &auth_data);
    // match auth_result {
    //     Ok(_) => (),
    //     Err(error) => {
    //         let formatted_error = format!("{:#?}", error);
    //         return HttpResponse::Unauthorized().body(formatted_error);
    //     }
    // }

    match api_on_central::patient_name_store_join(&service_provider, request.into_inner()) {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(error) => HttpResponse::InternalServerError().body(error.to_string()),
    }
}
