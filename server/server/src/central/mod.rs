use actix_web::web;
use sync::sync_on_central;

use crate::central_server_only;

mod name_store_join;
use name_store_join::patient_name_store_join;
mod sync;
mod sync_v7;

pub fn config_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(sync_on_central())
            .service(sync_v7::sync_on_central())
            .service(patient_name_store_join),
    );
}
