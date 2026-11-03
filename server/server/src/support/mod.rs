use actix_web::web::{self};

mod database;
mod log;
use database::get_database;
use database::vacuum_database;
use log::get_log_file;

const URL_PATH: &str = "/support";

pub fn config_support(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}{}", URL_PATH, "/database"),
        web::get().to(get_database),
    );
    cfg.route(
        &format!("{}{}", URL_PATH, "/vacuum"),
        web::post().to(vacuum_database),
    );
    cfg.route(
        &format!("{}{}", URL_PATH, "/log/{file_name}"),
        web::get().to(get_log_file),
    );
}
