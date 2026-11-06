use actix_web::web;
use sync::sync_on_central;
use sync_v7::sync_v7_on_central;
use user_login::user_on_central;

use crate::{central_server_only, middleware::initialised_only};

mod name_store_join;
use name_store_join::patient_name_store_join;
pub(crate) mod sync;
mod sync_v7;
pub(crate) mod tus;
mod user_login;

pub fn config_central(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("central")
            // A central learns it is central at the start of its first sync, before integration,
            // and integrates that sync in batches (#845). Until it has finished, remotes could
            // pull and push against partial data, e.g. a v7 remote could get a token from an early
            // `site` row and finish its own initialisation without the rows integrated after it.
            // The last wrap runs first, so not-central (405) is checked before this (503).
            .wrap(initialised_only(
                "Central server is still initialising, try again later.",
            ))
            .wrap(central_server_only())
            .service(sync_on_central())
            .service(sync_v7_on_central())
            .service(user_on_central())
            .service(patient_name_store_join),
    );
}
