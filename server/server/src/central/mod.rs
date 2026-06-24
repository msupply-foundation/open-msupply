use actix_web::web;
use sync::sync_on_central;
use sync_v7::sync_v7_on_central;
use user_login::user_on_central;

use crate::central_server_only;

mod name_store_join;
<<<<<<< HEAD
use name_store_join::patient_name_store_join;
pub(crate) mod sync;
pub(crate) mod tus;
=======
mod sync;
mod sync_v7;
mod user_login;
use name_store_join::patient_name_store_join;
>>>>>>> origin/v3.0.0-RC

pub fn config_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            .wrap(central_server_only())
            .service(sync_on_central())
            .service(sync_v7_on_central())
            .service(user_on_central())
            .service(patient_name_store_join),
    );
}
