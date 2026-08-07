use actix_web::web;
use service::print::label::MAX_RAW_LABEL_BYTES;

mod label;
use label::{get_label_asset, print_label_asset, print_label_prescription, print_label_raw};

use crate::print::label::get_label_prescription;

use self::label::test_printer;

const URL_PATH: &str = "/print";

pub fn config_print(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{URL_PATH}/label-qr"),
        web::post().to(print_label_asset),
    );
    cfg.route(
        &format!("{URL_PATH}/label-qr"),
        web::get().to(get_label_asset),
    );
    cfg.route(
        &format!("{URL_PATH}/label-prescription"),
        web::post().to(print_label_prescription),
    );
    cfg.route(
        &format!("{URL_PATH}/label-prescription"),
        web::get().to(get_label_prescription),
    );
    // Registered as a resource rather than a bare route so it can carry its own
    // JsonConfig: the app-wide limit is 10 MB, and without this actix would
    // buffer and deserialise all of that before the handler ever got to check
    // the length. The route-scoped limit makes actix reject an oversized body
    // itself, off the same constant the handler checks against.
    cfg.service(
        web::resource(format!("{URL_PATH}/label-raw"))
            .app_data(web::JsonConfig::default().limit(MAX_RAW_LABEL_BYTES))
            .route(web::post().to(print_label_raw)),
    );
    cfg.route(
        &format!("{URL_PATH}/label-test"),
        web::post().to(test_printer),
    );
}
